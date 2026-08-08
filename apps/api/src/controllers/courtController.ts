import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

// ===== Validation Schemas =====

const PricingRowSchema = z.object({
  period: z.enum(['day', 'night']),
  time_from: z.string().regex(/^\d{2}:\d{2}$/),
  time_to: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.number().positive(),
});

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

const CreateCourtSchema = z.object({
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
  open_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  close_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  open_daily: z.boolean().default(false),
  // Step 2 — Court Details
  num_courts: z.number().int().positive().optional().nullable(),
  surface_type_id: z.number().int().positive().optional().nullable(),
  indoor_outdoor: z.enum(['indoor', 'outdoor', 'both']).default('outdoor'),
  has_lights: z.boolean().default(false),
  pricing: z.array(PricingRowSchema).default([]),
  // Step 3 — Amenities
  amenities: AmenitySchema.default({}),
  // Step 4 — Images (URLs already uploaded via /upload)
  image_urls: z.array(z.string()).default([]),
});

const DuplicateCheckSchema = z.object({
  name: z.string().min(1),
  province_id: z.number().int().positive(),
  district_id: z.number().int().positive().optional().nullable(),
});

// ===== Handlers =====

/** POST /api/courts/check-duplicate */
export async function checkDuplicate(req: Request, res: Response): Promise<void> {
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
      surfaceType: { select: { id: true, name: true } },
      pricing: true,
      amenities: true,
    },
  });

  if (existing) {
    res.json({ isDuplicate: true, matchedCourt: existing });
    return;
  }
  res.json({ isDuplicate: false });
}

/** POST /api/courts — create new court (no-duplicate path) */
export async function createCourt(req: Request, res: Response): Promise<void> {
  const parse = CreateCourtSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
    return;
  }

  const ambassadorId = req.user!.id;
  const { pricing, amenities, image_urls, ...courtData } = parse.data;

  const court = await prisma.$transaction(async (tx) => {
    // 1. Create court
    const court = await tx.court.create({
      data: {
        ...courtData,
        submitted_by: ambassadorId,
        status: 'pending',
        is_published: false,
      },
    });

    // 2. Pricing rows
    if (pricing.length > 0) {
      await tx.courtPricing.createMany({
        data: pricing.map((p) => ({ ...p, court_id: court.id })),
      });
    }

    // 3. Amenities (1:1)
    await tx.courtAmenity.create({
      data: { court_id: court.id, ...amenities },
    });

    // 4. Images
    if (image_urls.length > 0) {
      await tx.courtImage.createMany({
        data: image_urls.map((url) => ({
          court_id: court.id,
          url,
          uploaded_by: ambassadorId,
          is_approved: false,
        })),
      });
    }

    // 5. Submission record
    await tx.courtSubmission.create({
      data: {
        court_id: court.id,
        ambassador_id: ambassadorId,
        payload_json: req.body,
        is_duplicate: false,
        submit_status: 'submitted',
        review_status: 'pending',
      },
    });

    return court;
  });

  res.status(201).json({ id: court.id, message: 'Court submitted for review' });
}

/** GET /api/courts/:id */
export async function getCourtById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const court = await prisma.court.findUnique({
    where: { id },
    include: {
      province: { select: { id: true, name_th: true } },
      district: { select: { id: true, name_th: true } },
      surfaceType: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, full_name: true } },
      pricing: true,
      amenities: true,
      images: { where: { is_approved: true } },
    },
  });

  if (!court) {
    res.status(404).json({ error: 'Court not found' });
    return;
  }
  res.json(court);
}

/** GET /api/courts — list published courts (public) */
export async function listCourts(req: Request, res: Response): Promise<void> {
  const province_id = req.query.province_id ? Number(req.query.province_id) : undefined;
  const district_id = req.query.district_id ? Number(req.query.district_id) : undefined;

  const courts = await prisma.court.findMany({
    where: {
      is_published: true,
      ...(province_id ? { province_id } : {}),
      ...(district_id ? { district_id } : {}),
    },
    include: {
      province: { select: { id: true, name_th: true } },
      district: { select: { id: true, name_th: true } },
      surfaceType: { select: { id: true, name: true } },
      pricing: true,
      amenities: true,
      images: { where: { is_approved: true }, take: 1 },
    },
    orderBy: { created_at: 'desc' },
  });
  res.json(courts);
}
