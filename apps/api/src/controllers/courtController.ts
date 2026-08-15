import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

/** Keeps DB outages distinguishable from genuine 500s. */
function fail(res: Response, err: unknown, label: string, generic: string) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[courts/${label}]`, msg);
  if (msg.includes('Authentication failed') || msg.includes('ECONNREFUSED') || msg.includes('P1001')) {
    res.status(503).json({ error: 'Database unavailable — check DATABASE_URL credentials' });
  } else {
    res.status(500).json({ error: generic });
  }
}

// ===== Validation Schemas =====

// An hourly row needs a time-of-day period and a from/to window; a flat
// daily row is just a price — no window to validate.
const HourlyPricingRowSchema = z.object({
  rate_type: z.literal('hour'),
  period: z.enum(['day', 'night']),
  time_from: z.string().regex(/^\d{2}:\d{2}$/, 'รูปแบบเวลาไม่ถูกต้อง'),
  time_to: z.string().regex(/^\d{2}:\d{2}$/, 'รูปแบบเวลาไม่ถูกต้อง'),
  price: z.number().positive('ราคาต้องมากกว่า 0'),
});
const DailyPricingRowSchema = z.object({
  rate_type: z.literal('day'),
  price: z.number().positive('ราคาต้องมากกว่า 0'),
});
const MonthlyPricingRowSchema = z.object({
  rate_type: z.literal('month'),
  price: z.number().positive('ราคาต้องมากกว่า 0'),
});
const PricingRowSchema = z.discriminatedUnion('rate_type', [
  HourlyPricingRowSchema,
  DailyPricingRowSchema,
  MonthlyPricingRowSchema,
]);

const AmenitySchema = z.object({
  has_coach: z.boolean().default(false),
  equipment_rental: z.boolean().default(false),
  parking_sufficient: z.boolean().default(false),
  has_restroom: z.boolean().default(false),
  has_shower: z.boolean().default(false),
  has_restaurant: z.boolean().default(false),
  has_cafe: z.boolean().default(false),
  has_stringing: z.boolean().default(false),
});

// One uploaded photo. `is_cover` marks the photo shown first on listings —
// at most one row may carry it (normalizeCoverFlags below enforces that).
const ImageRowSchema = z.object({
  url: z.string().min(1),
  is_cover: z.boolean().default(false),
});

// A venue can mix surfaces (e.g. 2 hard + 3 clay courts), so this replaces
// the old single num_courts + surface_type_id pair with one row per surface.
const SurfaceCountRowSchema = z.object({
  surface_type_id: z.number().int().positive(),
  num_courts: z.number().int().positive('จำนวนคอร์ตต้องมากกว่า 0'),
});

const CourtBaseSchema = z.object({
  // Step 1 — Basic Info
  name: z.string().min(2).max(200),
  province_id: z.number().int().positive(),
  district_id: z.number().int().positive().optional().nullable(),
  address_line: z.string().optional(),
  subdistrict: z.string().optional(),
  postal_code: z.string().optional(),
  google_map_link: z.string().url().optional().or(z.literal('')),
  phone: z.string().optional(),
  line_id: z.string().optional(),
  facebook_page: z.string().optional(),
  website: z.string().optional(),
  // The wizard defaults these to '' when left blank — accept that and treat
  // it the same as "not set" instead of failing the regex.
  open_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')).transform((v) => v || undefined),
  close_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')).transform((v) => v || undefined),
  open_daily: z.boolean().default(false),
  // Step 2 — Court Details
  surface_counts: z.array(SurfaceCountRowSchema).default([])
    .refine(
      (rows) => new Set(rows.map((r) => r.surface_type_id)).size === rows.length,
      { message: 'เลือกประเภทพื้นสนามซ้ำกันไม่ได้ — รวมจำนวนไว้ในแถวเดียวกัน' },
    ),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'both']).default('outdoor'),
  has_lights: z.boolean().default(false),
  pricing: z.array(PricingRowSchema).default([]),
  // Step 3 — Amenities
  amenities: AmenitySchema.default({}),
  // Step 4 — Photos (already uploaded via /upload; this just links them in)
  images: z.array(ImageRowSchema).default([]),
});

const CreateCourtSchema = CourtBaseSchema;
const UpdateCourtSchema = CourtBaseSchema;

const DuplicateCheckSchema = z.object({
  name: z.string().min(1),
  province_id: z.number().int().positive(),
  district_id: z.number().int().positive().optional().nullable(),
});

/** Exactly one photo ends up marked as cover once any photos exist. */
function normalizeCoverFlags(images: { url: string; is_cover: boolean }[]) {
  if (images.length === 0) return images;
  const coverIndex = images.findIndex((i) => i.is_cover);
  return images.map((img, i) => ({ ...img, is_cover: i === (coverIndex === -1 ? 0 : coverIndex) }));
}

const SURFACE_COUNTS_INCLUDE = {
  surfaceCounts: { include: { surfaceType: { select: { id: true, name: true } } } },
} as const;

const COURT_DETAIL_INCLUDE = {
  province: { select: { id: true, name_th: true } },
  district: { select: { id: true, name_th: true } },
  submittedBy: { select: { id: true, full_name: true } },
  submittedByAdmin: { select: { id: true, name: true } },
  pricing: true,
  amenities: true,
  ...SURFACE_COUNTS_INCLUDE,
} as const;

// ===== Handlers =====

/** POST /api/courts/check-duplicate */
export async function checkDuplicate(req: Request, res: Response): Promise<void> {
  try {
    const parse = DuplicateCheckSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
      return;
    }

    const { name, province_id, district_id } = parse.data;

    const existing = await prisma.court.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        province_id,
        ...(district_id ? { district_id } : {}),
      },
      include: {
        province: { select: { id: true, name_th: true } },
        district: { select: { id: true, name_th: true } },
        pricing: true,
        amenities: true,
        ...SURFACE_COUNTS_INCLUDE,
      },
    });

    if (existing) {
      res.json({ isDuplicate: true, matchedCourt: existing });
      return;
    }
    res.json({ isDuplicate: false });
  } catch (err) {
    fail(res, err, 'check-duplicate', 'ตรวจสอบข้อมูลซ้ำไม่สำเร็จ');
  }
}

/**
 * POST /api/courts — create new court (no-duplicate path). An admin can add
 * a court directly too — it still lands in the same pending review queue as
 * an ambassador submission, just attributed to the admin instead.
 */
export async function createCourt(req: Request, res: Response): Promise<void> {
  try {
    const parse = CreateCourtSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
      return;
    }

    const requester = req.user!;
    const isAdmin = requester.role === 'admin';
    const { pricing, amenities, images, surface_counts, ...courtData } = parse.data;
    const normalizedImages = normalizeCoverFlags(images);

    const court = await prisma.$transaction(async (tx) => {
      // 1. Create court
      const court = await tx.court.create({
        data: {
          ...courtData,
          submitted_by: isAdmin ? null : requester.id,
          submitted_by_admin: isAdmin ? requester.id : null,
          status: 'pending',
          is_published: false,
        },
      });

      // 2. Surface breakdown (e.g. 2 hard + 3 clay)
      if (surface_counts.length > 0) {
        await tx.courtSurfaceCount.createMany({
          data: surface_counts.map((s) => ({ ...s, court_id: court.id })),
        });
      }

      // 3. Pricing rows
      if (pricing.length > 0) {
        await tx.courtPricing.createMany({
          data: pricing.map((p) => ({ ...p, court_id: court.id })),
        });
      }

      // 4. Amenities (1:1)
      await tx.courtAmenity.create({
        data: { court_id: court.id, ...amenities },
      });

      // 5. Images
      if (normalizedImages.length > 0) {
        await tx.courtImage.createMany({
          data: normalizedImages.map((img) => ({
            court_id: court.id,
            url: img.url,
            is_cover: img.is_cover,
            uploaded_by: isAdmin ? null : requester.id,
            uploaded_by_admin: isAdmin ? requester.id : null,
            is_approved: false,
          })),
        });
      }

      // 6. Submission record
      await tx.courtSubmission.create({
        data: {
          court_id: court.id,
          ambassador_id: isAdmin ? null : requester.id,
          admin_submitter_id: isAdmin ? requester.id : null,
          payload_json: req.body,
          is_duplicate: false,
          submit_status: 'submitted',
          review_status: 'pending',
        },
      });

      return court;
    });

    res.status(201).json({ id: court.id, message: 'Court submitted for review' });
  } catch (err) {
    fail(res, err, 'create', 'ส่งข้อมูลสนามไม่สำเร็จ');
  }
}

/**
 * PATCH /api/courts/:id — edit a court's data directly.
 * An ambassador may only edit their own court, and only while it's still
 * pending review (once approved there's a published record other people may
 * already rely on, so editing is locked at that point). An admin bypasses
 * both restrictions — they can fix any court's data at any time, published
 * or not, which is the whole point of having admin-side edit access.
 */
export async function updateCourt(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const existing = await prisma.court.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'ไม่พบสนาม' }); return; }

    const requester = req.user!;
    const isAdmin = requester.role === 'admin';
    const isOwner = requester.role === 'ambassador' && existing.submitted_by === requester.id;
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขสนามนี้' });
      return;
    }
    if (!isAdmin && existing.status !== 'pending') {
      res.status(409).json({ error: 'แก้ไขได้เฉพาะสนามที่ยังรอตรวจสอบเท่านั้น' });
      return;
    }

    const parse = UpdateCourtSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
      return;
    }

    const { pricing, amenities, images, surface_counts, ...courtData } = parse.data;
    const normalizedImages = normalizeCoverFlags(images);

    await prisma.$transaction(async (tx) => {
      // 1. Update the court's own fields
      await tx.court.update({ where: { id }, data: courtData });

      // 2. Surface breakdown — full replace, this is still just a draft
      await tx.courtSurfaceCount.deleteMany({ where: { court_id: id } });
      if (surface_counts.length > 0) {
        await tx.courtSurfaceCount.createMany({
          data: surface_counts.map((s) => ({ ...s, court_id: id })),
        });
      }

      // 3. Pricing — full replace, this is still just a draft under review
      await tx.courtPricing.deleteMany({ where: { court_id: id } });
      if (pricing.length > 0) {
        await tx.courtPricing.createMany({ data: pricing.map((p) => ({ ...p, court_id: id })) });
      }

      // 4. Amenities (1:1)
      await tx.courtAmenity.upsert({
        where: { court_id: id },
        create: { court_id: id, ...amenities },
        update: amenities,
      });

      // 5. Images — full replace. Note: this does not delete the underlying
      // uploaded files from disk, only the DB rows linking them to the court.
      await tx.courtImage.deleteMany({ where: { court_id: id } });
      if (normalizedImages.length > 0) {
        await tx.courtImage.createMany({
          data: normalizedImages.map((img) => ({
            court_id: id,
            url: img.url,
            is_cover: img.is_cover,
            uploaded_by: isAdmin ? null : requester.id,
            uploaded_by_admin: isAdmin ? requester.id : null,
            is_approved: isAdmin, // an admin's own edit needs no separate photo approval
          })),
        });
      }

      // 6. Keep the latest submitted payload for the admin review screen —
      // only relevant while the court is still going through its original
      // pending submission; an admin editing an already-approved court has
      // no such submission row to update.
      if (!isAdmin || existing.status === 'pending') {
        await tx.courtSubmission.updateMany({
          where: { court_id: id, is_duplicate: false },
          data: { payload_json: req.body },
        });
      }
    });

    res.json({ id, message: 'บันทึกการแก้ไขเรียบร้อยแล้ว' });
  } catch (err) {
    fail(res, err, 'update', 'บันทึกการแก้ไขไม่สำเร็จ');
  }
}

/**
 * GET /api/courts/:id/manage — full detail including not-yet-approved
 * photos, for the owning ambassador (to prefill the edit form) or an admin.
 * The public GET /:id below deliberately hides unapproved photos instead.
 */
export async function getCourtForManage(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const court = await prisma.court.findUnique({
      where: { id },
      include: { ...COURT_DETAIL_INCLUDE, images: true },
    });
    if (!court) { res.status(404).json({ error: 'ไม่พบสนาม' }); return; }

    const requester = req.user!;
    const isOwner = requester.role === 'ambassador' && court.submitted_by === requester.id;
    const isAdmin = requester.role === 'admin';
    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' });
      return;
    }

    res.json(court);
  } catch (err) {
    fail(res, err, 'manage', 'โหลดข้อมูลสนามไม่สำเร็จ');
  }
}

/** GET /api/courts/:id — public detail (approved photos only) */
export async function getCourtById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const court = await prisma.court.findUnique({
      where: { id },
      include: { ...COURT_DETAIL_INCLUDE, images: { where: { is_approved: true } } },
    });

    if (!court) {
      res.status(404).json({ error: 'Court not found' });
      return;
    }
    res.json(court);
  } catch (err) {
    fail(res, err, 'get', 'โหลดข้อมูลสนามไม่สำเร็จ');
  }
}

/** GET /api/courts — list published courts (public). `q` matches court name. */
export async function listCourts(req: Request, res: Response): Promise<void> {
  try {
    const province_id = req.query.province_id ? Number(req.query.province_id) : undefined;
    const district_id = req.query.district_id ? Number(req.query.district_id) : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const courts = await prisma.court.findMany({
      where: {
        is_published: true,
        ...(province_id ? { province_id } : {}),
        ...(district_id ? { district_id } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: {
        province: { select: { id: true, name_th: true } },
        district: { select: { id: true, name_th: true } },
        pricing: true,
        amenities: true,
        ...SURFACE_COUNTS_INCLUDE,
        // Cover photo first so a `take: 1` thumbnail is never an arbitrary shot.
        images: { where: { is_approved: true }, orderBy: { is_cover: 'desc' }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(courts);
  } catch (err) {
    fail(res, err, 'list', 'โหลดรายการสนามไม่สำเร็จ');
  }
}
