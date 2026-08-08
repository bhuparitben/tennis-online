import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

// Fields to compare when detecting changes (in display order)
const COMPARABLE_FIELDS: Array<keyof Prisma.CourtGetPayload<object>> = [
  'name', 'phone', 'line_id', 'facebook_page', 'website',
  'address_line', 'subdistrict', 'postal_code', 'google_map_link',
  'open_time', 'close_time', 'open_daily',
  'num_courts', 'indoor_outdoor', 'has_lights',
];

type PlainObject = Record<string, unknown>;

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Generate field-by-field diff between existing court and new form data */
function buildFieldChanges(existing: PlainObject, incoming: PlainObject): Array<{
  field_name: string;
  old_value: string;
  new_value: string;
  is_changed: boolean;
}> {
  const changes = [];

  for (const field of COMPARABLE_FIELDS) {
    const old_value = stringifyValue(existing[field]);
    const new_value = stringifyValue(incoming[field as string]);
    changes.push({
      field_name: String(field),
      old_value,
      new_value,
      is_changed: old_value !== new_value,
    });
  }

  // Amenities comparison
  const oldAm = (existing.amenities ?? {}) as PlainObject;
  const newAm = (incoming.amenities ?? {}) as PlainObject;
  const amenityFields = ['has_coach', 'equipment_rental', 'parking_sufficient', 'has_restroom', 'has_shower', 'has_restaurant', 'has_cafe', 'has_stringing'];
  for (const f of amenityFields) {
    const old_value = stringifyValue(oldAm[f]);
    const new_value = stringifyValue(newAm[f]);
    changes.push({ field_name: `amenity_${f}`, old_value, new_value, is_changed: old_value !== new_value });
  }

  return changes;
}

// ===== Handlers =====

/** POST /api/submissions/duplicate — create submission for a detected duplicate */
export async function createDuplicateSubmission(req: Request, res: Response): Promise<void> {
  const schema = z.object({
    matched_court_id: z.number().int().positive(),
    form_data: z.record(z.unknown()),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
    return;
  }

  const { matched_court_id, form_data } = parse.data;
  const ambassadorId = req.user!.id;

  // Load existing court data for comparison
  const existing = await prisma.court.findUnique({
    where: { id: matched_court_id },
    include: { amenities: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Matched court not found' });
    return;
  }

  const fieldChanges = buildFieldChanges(existing as unknown as PlainObject, form_data);

  const submission = await prisma.$transaction(async (tx) => {
    const submission = await tx.courtSubmission.create({
      data: {
        matched_court_id,
        ambassador_id: ambassadorId,
        payload_json: form_data,
        is_duplicate: true,
        submit_status: 'submitted',
        review_status: 'pending',
      },
    });

    await tx.courtFieldChange.createMany({
      data: fieldChanges.map((fc) => ({ ...fc, submission_id: submission.id })),
    });

    // Create initial verification record
    await tx.courtVerification.create({
      data: {
        court_id: matched_court_id,
        submission_id: submission.id,
        status: 'pending',
        verified_by: ambassadorId,
        verified_at: new Date(),
      },
    });

    return submission;
  });

  res.status(201).json({ id: submission.id, message: 'Duplicate submission created for review' });
}

/** GET /api/submissions/:id — full submission with field changes and matched court */
export async function getSubmission(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const submission = await prisma.courtSubmission.findUnique({
    where: { id },
    include: {
      ambassador: { select: { id: true, full_name: true, province: { select: { name_th: true } } } },
      court: { include: { pricing: true, amenities: true, images: true, province: true, district: true } },
      matchedCourt: { include: { pricing: true, amenities: true, images: true, province: true, district: true } },
      fieldChanges: { orderBy: { id: 'asc' } },
      verifications: {
        orderBy: { verified_at: 'desc' },
        include: { verifiedBy: { select: { id: true, full_name: true } } },
      },
    },
  });

  if (!submission) { res.status(404).json({ error: 'Submission not found' }); return; }
  res.json(submission);
}

/** PATCH /api/submissions/:id/verify — ambassador updates verification status */
export async function verifySubmission(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const schema = z.object({
    status: z.enum(['pending', 'verified', 'need_update']),
    note: z.string().optional(),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const ambassadorId = req.user!.id;
  const { status, note } = parse.data;

  const submission = await prisma.courtSubmission.findUnique({ where: { id } });
  if (!submission) { res.status(404).json({ error: 'Submission not found' }); return; }

  await prisma.$transaction([
    // Update submission review_status
    prisma.courtSubmission.update({
      where: { id },
      data: { review_status: status === 'verified' ? 'verified' : 'need_update' },
    }),
    // Append to verification timeline
    prisma.courtVerification.create({
      data: {
        court_id: submission.matched_court_id ?? submission.court_id!,
        submission_id: id,
        status,
        note,
        verified_by: ambassadorId,
        verified_at: new Date(),
      },
    }),
  ]);

  res.json({ message: 'Verification status updated' });
}

/** PATCH /api/submissions/:id/approve — admin approves, applies field choices */
export async function approveSubmission(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const schema = z.object({
    // field_name → 'old' | 'new'
    field_choices: z.record(z.enum(['old', 'new'])).default({}),
    review_note: z.string().optional(),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: 'Invalid input' }); return; }

  const adminId = req.user!.id;
  const { field_choices, review_note } = parse.data;

  const submission = await prisma.courtSubmission.findUnique({
    where: { id },
    include: {
      fieldChanges: true,
      matchedCourt: { include: { amenities: true } },
    },
  });
  if (!submission) { res.status(404).json({ error: 'Submission not found' }); return; }

  await prisma.$transaction(async (tx) => {
    // 1. Save admin_choice per field change
    for (const fc of submission.fieldChanges) {
      const choice = field_choices[fc.field_name] ?? 'old';
      await tx.courtFieldChange.update({
        where: { id: fc.id },
        data: { admin_choice: choice },
      });
    }

    // 2. If duplicate, apply chosen values to the matched court
    if (submission.is_duplicate && submission.matched_court_id) {
      const courtUpdates: PlainObject = {};
      const amenityUpdates: PlainObject = {};

      for (const fc of submission.fieldChanges) {
        const chosen = field_choices[fc.field_name] ?? 'old';
        const value = chosen === 'new' ? fc.new_value : fc.old_value;

        if (fc.field_name.startsWith('amenity_')) {
          const amenField = fc.field_name.replace('amenity_', '');
          amenityUpdates[amenField] = value === 'true';
        } else {
          courtUpdates[fc.field_name] = value === '' ? null : value;
        }
      }

      if (Object.keys(courtUpdates).length > 0) {
        await tx.court.update({
          where: { id: submission.matched_court_id },
          data: { ...courtUpdates, status: 'approved', is_published: true } as Prisma.CourtUpdateInput,
        });
      } else {
        await tx.court.update({
          where: { id: submission.matched_court_id },
          data: { status: 'approved', is_published: true },
        });
      }

      if (Object.keys(amenityUpdates).length > 0 && submission.matchedCourt?.amenities) {
        await tx.courtAmenity.update({
          where: { court_id: submission.matched_court_id },
          data: amenityUpdates as Prisma.CourtAmenityUpdateInput,
        });
      }
    }

    // 3. If new court (non-duplicate), just publish it
    if (!submission.is_duplicate && submission.court_id) {
      await tx.court.update({
        where: { id: submission.court_id },
        data: { status: 'approved', is_published: true },
      });
    }

    // 4. Mark submission as approved
    await tx.courtSubmission.update({
      where: { id },
      data: {
        review_status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date(),
        review_note,
      },
    });
  });

  res.json({ message: 'Submission approved and court published' });
}

/** GET /api/submissions — list submissions (admin sees all, ambassador sees own) */
export async function listSubmissions(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const where = user.role === 'admin' ? {} : { ambassador_id: user.id };

  const submissions = await prisma.courtSubmission.findMany({
    where,
    include: {
      ambassador: { select: { id: true, full_name: true } },
      court: { select: { id: true, name: true } },
      matchedCourt: { select: { id: true, name: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  res.json(submissions);
}
