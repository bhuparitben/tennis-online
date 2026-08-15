import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

/** Keeps DB outages distinguishable from genuine 500s. */
function fail(res: Response, err: unknown, label: string, generic: string) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[reference/${label}]`, msg);
  if (msg.includes('Authentication failed') || msg.includes('ECONNREFUSED') || msg.includes('P1001')) {
    res.status(503).json({ error: 'Database unavailable — check DATABASE_URL credentials' });
  } else {
    res.status(500).json({ error: generic });
  }
}

const REGIONS = [
  'ภาคเหนือ', 'ภาคกลาง', 'ภาคตะวันออก', 'ภาคตะวันตก',
  'ภาคตะวันออกเฉียงเหนือ', 'ภาคใต้',
] as const;

// ===== Public reads =====

// GET /api/provinces
router.get('/provinces', async (_req: Request, res: Response) => {
  try {
    const provinces = await prisma.province.findMany({
      orderBy: [{ region: 'asc' }, { name_th: 'asc' }],
      select: {
        id: true, name_th: true, name_en: true, region: true,
        _count: { select: { districts: true } },
      },
    });
    res.json(provinces);
  } catch (err) {
    fail(res, err, 'provinces:list', 'Could not load provinces');
  }
});

// GET /api/districts?province_id=1
router.get('/districts', async (req: Request, res: Response) => {
  try {
    const province_id = Number(req.query.province_id);
    if (!province_id || isNaN(province_id)) {
      res.status(400).json({ error: 'province_id query param is required' });
      return;
    }
    const districts = await prisma.district.findMany({
      where: { province_id },
      orderBy: { name_th: 'asc' },
      select: { id: true, name_th: true, province_id: true },
    });
    res.json(districts);
  } catch (err) {
    fail(res, err, 'districts:list', 'Could not load districts');
  }
});

// GET /api/surface-types
router.get('/surface-types', async (_req: Request, res: Response) => {
  try {
    const types = await prisma.surfaceType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  } catch (err) {
    fail(res, err, 'surface-types', 'Could not load surface types');
  }
});

// ===== Admin: province management =====

const ProvinceSchema = z.object({
  name_th: z.string().min(1, 'กรุณากรอกชื่อจังหวัด').max(100),
  name_en: z.string().min(1, 'กรุณากรอกชื่อภาษาอังกฤษ').max(100),
  region: z.enum(REGIONS, { message: 'ภูมิภาคไม่ถูกต้อง' }),
});

// POST /api/provinces — admin
router.post('/provinces', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const parse = ProvinceSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const name_th = parse.data.name_th.trim();

    const clash = await prisma.province.findUnique({ where: { name_th } });
    if (clash) {
      res.status(409).json({ error: 'มีจังหวัดนี้อยู่แล้ว' });
      return;
    }

    const province = await prisma.province.create({
      data: { ...parse.data, name_th, name_en: parse.data.name_en.trim() },
    });
    res.status(201).json(province);
  } catch (err) {
    fail(res, err, 'provinces:create', 'เพิ่มจังหวัดไม่สำเร็จ');
  }
});

// PATCH /api/provinces/:id — admin
router.patch('/provinces/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const parse = ProvinceSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const name_th = parse.data.name_th.trim();

    const existing = await prisma.province.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'ไม่พบจังหวัด' }); return; }

    const clash = await prisma.province.findFirst({ where: { name_th, NOT: { id } } });
    if (clash) {
      res.status(409).json({ error: 'มีจังหวัดนี้อยู่แล้ว' });
      return;
    }

    const province = await prisma.province.update({
      where: { id },
      data: { ...parse.data, name_th, name_en: parse.data.name_en.trim() },
    });
    res.json(province);
  } catch (err) {
    fail(res, err, 'provinces:update', 'บันทึกข้อมูลไม่สำเร็จ');
  }
});

// DELETE /api/provinces/:id — admin
router.delete('/provinces/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const province = await prisma.province.findUnique({
      where: { id },
      include: { _count: { select: { districts: true, ambassadors: true, courts: true } } },
    });
    if (!province) { res.status(404).json({ error: 'ไม่พบจังหวัด' }); return; }

    const { districts, ambassadors, courts } = province._count;
    if (districts || ambassadors || courts) {
      res.status(409).json({
        error: `ลบไม่ได้ — มีข้อมูลผูกอยู่ (อำเภอ ${districts}, ผู้สมัคร ${ambassadors}, สนาม ${courts})`,
      });
      return;
    }

    await prisma.province.delete({ where: { id } });
    res.json({ message: 'ลบจังหวัดแล้ว' });
  } catch (err) {
    fail(res, err, 'provinces:delete', 'ลบจังหวัดไม่สำเร็จ');
  }
});

// ===== Admin: district management =====

const DistrictCreateSchema = z.object({
  province_id: z.number().int().positive('กรุณาเลือกจังหวัด'),
  name_th: z.string().min(1, 'กรุณากรอกชื่ออำเภอ').max(100),
});

// POST /api/districts — admin
router.post('/districts', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const parse = DistrictCreateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const name_th = parse.data.name_th.trim();

    const province = await prisma.province.findUnique({ where: { id: parse.data.province_id } });
    if (!province) { res.status(400).json({ error: 'ไม่พบจังหวัดที่เลือก' }); return; }

    const clash = await prisma.district.findFirst({ where: { province_id: parse.data.province_id, name_th } });
    if (clash) {
      res.status(409).json({ error: 'มีอำเภอนี้อยู่แล้วในจังหวัดนี้' });
      return;
    }

    const district = await prisma.district.create({
      data: { province_id: parse.data.province_id, name_th },
    });
    res.status(201).json(district);
  } catch (err) {
    fail(res, err, 'districts:create', 'เพิ่มอำเภอไม่สำเร็จ');
  }
});

const DistrictUpdateSchema = z.object({
  name_th: z.string().min(1, 'กรุณากรอกชื่ออำเภอ').max(100),
});

// PATCH /api/districts/:id — admin (rename only; move between provinces via delete+recreate)
router.patch('/districts/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const parse = DistrictUpdateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const name_th = parse.data.name_th.trim();

    const existing = await prisma.district.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'ไม่พบอำเภอ' }); return; }

    const clash = await prisma.district.findFirst({
      where: { province_id: existing.province_id, name_th, NOT: { id } },
    });
    if (clash) {
      res.status(409).json({ error: 'มีอำเภอนี้อยู่แล้วในจังหวัดนี้' });
      return;
    }

    const district = await prisma.district.update({ where: { id }, data: { name_th } });
    res.json(district);
  } catch (err) {
    fail(res, err, 'districts:update', 'บันทึกข้อมูลไม่สำเร็จ');
  }
});

// DELETE /api/districts/:id — admin
router.delete('/districts/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const district = await prisma.district.findUnique({
      where: { id },
      include: { _count: { select: { courts: true } } },
    });
    if (!district) { res.status(404).json({ error: 'ไม่พบอำเภอ' }); return; }

    if (district._count.courts) {
      res.status(409).json({ error: `ลบไม่ได้ — มีสนาม ${district._count.courts} แห่งผูกกับอำเภอนี้` });
      return;
    }

    await prisma.district.delete({ where: { id } });
    res.json({ message: 'ลบอำเภอแล้ว' });
  } catch (err) {
    fail(res, err, 'districts:delete', 'ลบอำเภอไม่สำเร็จ');
  }
});

export default router;
