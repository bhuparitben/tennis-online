import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/** Keeps DB outages distinguishable from genuine 500s. */
function fail(res: Response, err: unknown, label: string, generic: string) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[submissions/${label}]`, msg);
  if (msg.includes('Authentication failed') || msg.includes('ECONNREFUSED') || msg.includes('P1001')) {
    res.status(503).json({ error: 'Database unavailable — check DATABASE_URL credentials' });
  } else {
    res.status(500).json({ error: generic });
  }
}

// Fields to compare when detecting changes (in display order)
const COMPARABLE_FIELDS: Array<keyof Prisma.CourtGetPayload<object>> = [
  'name', 'phone', 'line_id', 'facebook_page', 'website',
  'address_line', 'subdistrict', 'postal_code', 'google_map_link',
  'open_time', 'close_time', 'open_daily',
  'indoor_outdoor', 'has_lights',
];

type PlainObject = Record<string, unknown>;

// Diffed as strings for display, but these two are real Boolean columns on
// Court — applying a chosen value has to convert back or Prisma rejects it.
const BOOLEAN_COURT_FIELDS = new Set(['open_daily', 'has_lights']);

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

interface SurfaceCountLike { surface_type_id: number; num_courts: number }

/** "Hard 2, Clay 3" — sorted so the diff is stable regardless of entry order. */
function formatSurfaceCounts(rows: SurfaceCountLike[] | undefined, nameById: Map<number, string>): string {
  if (!rows || rows.length === 0) return '';
  return rows
    .map((r) => `${nameById.get(r.surface_type_id) ?? '?'} ${r.num_courts}`)
    .sort()
    .join(', ');
}

/** Generate field-by-field diff between existing court and new form data */
function buildFieldChanges(
  existing: PlainObject,
  incoming: PlainObject,
  surfaceNameById: Map<number, string>,
): Array<{
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

  // Surface breakdown comparison — one court can mix surfaces, so this is
  // formatted as a single readable string rather than diffed row-by-row.
  const oldSurfaces = formatSurfaceCounts(existing.surfaceCounts as SurfaceCountLike[] | undefined, surfaceNameById);
  const newSurfaces = formatSurfaceCounts(incoming.surface_counts as SurfaceCountLike[] | undefined, surfaceNameById);
  changes.push({
    field_name: 'surface_counts',
    old_value: oldSurfaces,
    new_value: newSurfaces,
    is_changed: oldSurfaces !== newSurfaces,
  });

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
  try {
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
    const requester = req.user!;
    const isAdmin = requester.role === 'admin';

    // Load existing court data for comparison
    const existing = await prisma.court.findUnique({
      where: { id: matched_court_id },
      include: { amenities: true, surfaceCounts: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Matched court not found' });
      return;
    }

    const surfaceTypes = await prisma.surfaceType.findMany({ select: { id: true, name: true } });
    const surfaceNameById = new Map(surfaceTypes.map((s) => [s.id, s.name]));

    const fieldChanges = buildFieldChanges(existing as unknown as PlainObject, form_data, surfaceNameById);

    const submission = await prisma.$transaction(async (tx) => {
      const submission = await tx.courtSubmission.create({
        data: {
          matched_court_id,
          ambassador_id: isAdmin ? null : requester.id,
          admin_submitter_id: isAdmin ? requester.id : null,
          payload_json: form_data,
          is_duplicate: true,
          submit_status: 'submitted',
          review_status: 'pending',
        },
      });

      await tx.courtFieldChange.createMany({
        data: fieldChanges.map((fc) => ({ ...fc, submission_id: submission.id })),
      });

      // Create initial verification record — CourtVerification.verified_by
      // is an Ambassador-only FK, so an admin's own submission just leaves
      // it unattributed rather than pointing at a nonexistent ambassador row.
      await tx.courtVerification.create({
        data: {
          court_id: matched_court_id,
          submission_id: submission.id,
          status: 'pending',
          verified_by: isAdmin ? null : requester.id,
          verified_at: new Date(),
        },
      });

      return submission;
    });

    res.status(201).json({ id: submission.id, message: 'Duplicate submission created for review' });
  } catch (err) {
    fail(res, err, 'duplicate', 'Could not create duplicate submission');
  }
}

// Structured/derived fields that can't be edited as a single free-text value
// from the compare table — surface_counts is a formatted summary of several
// (surface type, count) rows, not a value that round-trips through a string.
const NON_EDITABLE_FIELDS = new Set(['surface_counts']);
const ENUM_FIELD_OPTIONS: Record<string, string[]> = {
  indoor_outdoor: ['indoor', 'outdoor', 'both'],
};

/**
 * PATCH /api/submissions/:id/field — ambassador edits a single "new value"
 * cell directly from the compare table, without re-running the whole wizard.
 * Only the submission's own ambassador may do this, and only before an
 * admin has approved it — once approved, the record other people may act on.
 */
export async function updateSubmissionField(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const schema = z.object({
      field_name: z.string().min(1),
      new_value: z.string(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ error: 'Invalid input' }); return; }
    const { field_name, new_value } = parse.data;

    if (NON_EDITABLE_FIELDS.has(field_name)) {
      res.status(400).json({ error: 'ฟิลด์นี้แก้ไขจากตารางเปรียบเทียบไม่ได้' });
      return;
    }
    if (BOOLEAN_COURT_FIELDS.has(field_name) && new_value !== 'true' && new_value !== 'false') {
      res.status(400).json({ error: 'ค่าฟิลด์นี้ต้องเป็น true หรือ false' });
      return;
    }
    if (ENUM_FIELD_OPTIONS[field_name] && !ENUM_FIELD_OPTIONS[field_name].includes(new_value)) {
      res.status(400).json({ error: 'ค่าที่เลือกไม่ถูกต้อง' });
      return;
    }

    const submission = await prisma.courtSubmission.findUnique({ where: { id } });
    if (!submission) { res.status(404).json({ error: 'Submission not found' }); return; }

    const requester = req.user!;
    const isOwner = requester.role === 'ambassador' && submission.ambassador_id === requester.id;
    if (!isOwner) { res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้' }); return; }
    if (!submission.is_duplicate) {
      res.status(400).json({ error: 'ใช้ได้เฉพาะการตรวจสอบข้อมูลซ้ำ' });
      return;
    }
    if (submission.review_status === 'approved') {
      res.status(409).json({ error: 'แก้ไขไม่ได้แล้ว — Admin อนุมัติข้อมูลนี้ไปแล้ว' });
      return;
    }

    const fieldChange = await prisma.courtFieldChange.findFirst({ where: { submission_id: id, field_name } });
    if (!fieldChange) { res.status(404).json({ error: 'ไม่พบฟิลด์นี้ในรายการเปรียบเทียบ' }); return; }

    const isChanged = fieldChange.old_value !== new_value;

    await prisma.$transaction(async (tx) => {
      await tx.courtFieldChange.update({
        where: { id: fieldChange.id },
        data: { new_value, is_changed: isChanged },
      });

      // Keep payload_json in sync — it's what approveSubmission reads from
      // when the admin ends up choosing "new" for this field (or for
      // surface_counts, always). Left stale, an edit here would silently
      // get lost the moment the submission is approved.
      const payload = { ...(submission.payload_json as PlainObject) };
      if (field_name.startsWith('amenity_')) {
        const key = field_name.replace('amenity_', '');
        payload.amenities = { ...((payload.amenities as PlainObject) ?? {}), [key]: new_value === 'true' };
      } else if (BOOLEAN_COURT_FIELDS.has(field_name)) {
        payload[field_name] = new_value === 'true';
      } else {
        payload[field_name] = new_value;
      }

      // Editing a value after already saying "ยืนยันข้อมูล" (or being told
      // "ต้องแก้ไข") means that attestation no longer holds for the new
      // value — put it back in the pending queue instead of leaving it
      // looking resolved with unreviewed edits underneath.
      await tx.courtSubmission.update({
        where: { id },
        data: {
          payload_json: payload as Prisma.InputJsonValue,
          review_status: 'pending',
        },
      });
    });

    res.json({ message: 'บันทึกการแก้ไขเรียบร้อยแล้ว', is_changed: isChanged });
  } catch (err) {
    fail(res, err, 'update-field', 'บันทึกการแก้ไขไม่สำเร็จ');
  }
}

/** GET /api/submissions/:id — full submission with field changes and matched court */
export async function getSubmission(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

    const submission = await prisma.courtSubmission.findUnique({
      where: { id },
      include: {
        ambassador: { select: { id: true, full_name: true, province: { select: { name_th: true } } } },
        adminSubmitter: { select: { id: true, name: true } },
        court: {
          include: {
            pricing: true, amenities: true, images: true, province: true, district: true,
            surfaceCounts: { include: { surfaceType: { select: { id: true, name: true } } } },
          },
        },
        matchedCourt: {
          include: {
            pricing: true, amenities: true, images: true, province: true, district: true,
            surfaceCounts: { include: { surfaceType: { select: { id: true, name: true } } } },
          },
        },
        fieldChanges: { orderBy: { id: 'asc' } },
        verifications: {
          orderBy: { verified_at: 'desc' },
          include: { verifiedBy: { select: { id: true, full_name: true } } },
        },
      },
    });

    if (!submission) { res.status(404).json({ error: 'Submission not found' }); return; }

    // An ambassador may only view their own submissions — this endpoint
    // returns another ambassador's phone number, address, etc., which
    // shouldn't be readable just by guessing an id.
    const requester = req.user!;
    if (requester.role === 'ambassador' && submission.ambassador_id !== requester.id) {
      res.status(403).json({ error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
      return;
    }

    res.json(submission);
  } catch (err) {
    fail(res, err, 'get', 'Could not load submission');
  }
}

/** PATCH /api/submissions/:id/verify — ambassador updates verification status */
export async function verifySubmission(req: Request, res: Response): Promise<void> {
  try {
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
  } catch (err) {
    fail(res, err, 'verify', 'Could not update verification status');
  }
}

/** PATCH /api/submissions/:id/approve — admin approves, applies field choices */
export async function approveSubmission(req: Request, res: Response): Promise<void> {
  try {
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
        let useNewSurfaceCounts = false;

        for (const fc of submission.fieldChanges) {
          const chosen = field_choices[fc.field_name] ?? 'old';
          const value = chosen === 'new' ? fc.new_value : fc.old_value;

          if (fc.field_name === 'surface_counts') {
            // Not a real column — applied separately below via the
            // CourtSurfaceCount table, using the originally submitted rows.
            useNewSurfaceCounts = chosen === 'new';
          } else if (fc.field_name.startsWith('amenity_')) {
            const amenField = fc.field_name.replace('amenity_', '');
            amenityUpdates[amenField] = value === 'true';
          } else if (BOOLEAN_COURT_FIELDS.has(fc.field_name)) {
            // Diff values are always strings ("true"/"false") for display —
            // Prisma rejects a string here, so these two need converting back.
            courtUpdates[fc.field_name] = value === 'true';
          } else {
            courtUpdates[fc.field_name] = value === '' ? null : value;
          }
        }

        if (useNewSurfaceCounts) {
          const submitted = (submission.payload_json as PlainObject)?.surface_counts;
          const rows = Array.isArray(submitted)
            ? (submitted as SurfaceCountLike[]).filter(
                (r) => typeof r?.surface_type_id === 'number' && typeof r?.num_courts === 'number',
              )
            : [];
          await tx.courtSurfaceCount.deleteMany({ where: { court_id: submission.matched_court_id } });
          if (rows.length > 0) {
            await tx.courtSurfaceCount.createMany({
              data: rows.map((r) => ({ ...r, court_id: submission.matched_court_id! })),
            });
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
  } catch (err) {
    fail(res, err, 'approve', 'Could not approve submission');
  }
}

// A submission's identity may live on either side depending on whether it
// was a brand-new court or a duplicate matched against an existing one.
const COURT_CARD_SELECT = {
  select: {
    id: true,
    name: true,
    province: { select: { name_th: true } },
    images: { take: 1, orderBy: { is_cover: 'desc' as const }, select: { url: true } },
  },
};

/** GET /api/submissions — list submissions (admin sees all, ambassador sees own) */
export async function listSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const where = user.role === 'admin' ? {} : { ambassador_id: user.id };

    const submissions = await prisma.courtSubmission.findMany({
      where,
      include: {
        ambassador: { select: { id: true, full_name: true } },
        adminSubmitter: { select: { id: true, name: true } },
        court: COURT_CARD_SELECT,
        matchedCourt: COURT_CARD_SELECT,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(submissions);
  } catch (err) {
    fail(res, err, 'list', 'Could not load submissions');
  }
}

/**
 * DELETE /api/submissions/:id — remove a submission row.
 *  - Admin can delete anything, anytime.
 *  - An ambassador can withdraw their own submission, but only before an
 *    admin has approved it — once approved, other people may already be
 *    relying on the applied result.
 *  - Duplicate/update proposal (is_duplicate): only the proposal itself is
 *    removed — the matched court it targets is never touched, since that's
 *    a real, possibly-already-published record other proposals may also
 *    reference.
 *  - Brand-new-court proposal: the court belongs to this submission alone,
 *    so removing it takes the (not-yet or newly) published court with it,
 *    along with anything else that ever referenced that court.
 */
export async function deleteSubmission(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const submission = await prisma.courtSubmission.findUnique({ where: { id } });
    if (!submission) { res.status(404).json({ error: 'Submission not found' }); return; }

    const requester = req.user!;
    const isAdmin = requester.role === 'admin';
    const isOwner = requester.role === 'ambassador' && submission.ambassador_id === requester.id;
    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบรายการนี้' });
      return;
    }
    if (!isAdmin && submission.review_status === 'approved') {
      res.status(409).json({ error: 'ลบไม่ได้แล้ว — Admin อนุมัติข้อมูลนี้ไปแล้ว' });
      return;
    }

    if (submission.is_duplicate) {
      await prisma.$transaction(async (tx) => {
        await tx.courtVerification.deleteMany({ where: { submission_id: id } });
        await tx.courtSubmission.delete({ where: { id } }); // fieldChanges cascade
      });
      res.json({ message: 'ลบคำขอตรวจสอบข้อมูลซ้ำเรียบร้อยแล้ว' });
      return;
    }

    if (!submission.court_id) {
      await prisma.courtSubmission.delete({ where: { id } });
      res.json({ message: 'ลบคำขอเรียบร้อยแล้ว' });
      return;
    }

    const courtId = submission.court_id;
    await prisma.$transaction(async (tx) => {
      // Verifications and any submissions referencing this court either way
      // (its own creation, or someone else's duplicate-update proposal
      // against it) have to go first — neither relation cascades on delete.
      await tx.courtVerification.deleteMany({ where: { court_id: courtId } });
      await tx.courtSubmission.deleteMany({ where: { OR: [{ court_id: courtId }, { matched_court_id: courtId }] } });
      // Cascades surfaceCounts / pricing / amenities / images.
      await tx.court.delete({ where: { id: courtId } });
    });
    res.json({ message: 'ลบสนามและคำขอที่เกี่ยวข้องเรียบร้อยแล้ว' });
  } catch (err) {
    fail(res, err, 'delete', 'ลบไม่สำเร็จ');
  }
}
