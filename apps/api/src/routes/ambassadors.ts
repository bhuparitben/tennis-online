import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

/** Keeps DB outages distinguishable from genuine 500s. */
function fail(res: Response, err: unknown, label: string, generic: string) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[ambassadors/${label}]`, msg);
  if (msg.includes('Authentication failed') || msg.includes('ECONNREFUSED') || msg.includes('P1001')) {
    res.status(503).json({ error: 'Database unavailable — check DATABASE_URL credentials' });
  } else {
    res.status(500).json({ error: generic });
  }
}

// GET /api/ambassadors/me — own profile
router.get('/me', requireAuth, requireRole('ambassador'), async (req: Request, res: Response) => {
  try {
    const amb = await prisma.ambassador.findUnique({
      where: { id: req.user!.id },
      include: {
        province: { select: { id: true, name_th: true } },
        _count: { select: { courts: true, submissions: true } },
      },
    });
    if (!amb) { res.status(404).json({ error: 'Not found' }); return; }

    const { password_hash, ...safe } = amb;
    void password_hash;
    res.json(safe);
  } catch (err) {
    fail(res, err, 'me', 'Could not load profile');
  }
});

// GET /api/ambassadors — admin list
router.get('/', requireAuth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.ambassador.findMany({
      select: {
        id: true, full_name: true, email: true, phone: true, line_id: true,
        province_id: true, district_zone: true, tennis_role: true, status: true, note: true,
        created_at: true, approved_at: true,
        password_hash: true,
        province: { select: { id: true, name_th: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
    });

    // Never ship the hash — expose only whether the account can sign in yet.
    const ambassadors = rows.map(({ password_hash, ...r }) => ({
      ...r,
      can_login: !!password_hash && !!r.email,
    }));
    res.json(ambassadors);
  } catch (err) {
    fail(res, err, 'list', 'Could not load ambassadors');
  }
});

// GET /api/ambassadors/:id — admin only
router.get('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const amb = await prisma.ambassador.findUnique({
      where: { id },
      include: { province: true, approvedBy: { select: { id: true, name: true } } },
    });
    if (!amb) { res.status(404).json({ error: 'Not found' }); return; }

    const { password_hash, ...safe } = amb;
    res.json({ ...safe, can_login: !!password_hash && !!amb.email });
  } catch (err) {
    fail(res, err, 'get', 'Could not load ambassador');
  }
});

const UpdateSchema = z.object({
  full_name: z.string().min(2, 'กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน').max(150),
  email: z.string().email('อีเมลไม่ถูกต้อง').max(150),
  phone: z.string().max(20).optional().nullable(),
  line_id: z.string().max(100).optional().nullable(),
  province_id: z.number().int().positive('กรุณาเลือกจังหวัด'),
  district_zone: z.string().max(100).optional().nullable(),
  tennis_role: z.string().max(50).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  /** Present only when the admin wants to reset the password from this dialog. */
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').max(72).optional().or(z.literal('')),
});

// PATCH /api/ambassadors/:id — admin edits full profile (not the approval status)
router.patch('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const parse = UpdateSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const { password, ...fields } = parse.data;
    const email = fields.email.trim().toLowerCase();

    const target = await prisma.ambassador.findUnique({ where: { id } });
    if (!target) { res.status(404).json({ error: 'ไม่พบผู้สมัคร' }); return; }

    const province = await prisma.province.findUnique({ where: { id: fields.province_id } });
    if (!province) { res.status(400).json({ error: 'ไม่พบจังหวัดที่เลือก' }); return; }

    // Email doubles as the login identity across both account tables.
    const [adminClash, ambClash] = await Promise.all([
      prisma.admin.findFirst({ where: { email } }),
      prisma.ambassador.findFirst({ where: { email, NOT: { id } } }),
    ]);
    if (adminClash || ambClash) {
      res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
      return;
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : undefined;

    const updated = await prisma.ambassador.update({
      where: { id },
      data: {
        full_name: fields.full_name.trim(),
        email,
        phone: fields.phone || null,
        line_id: fields.line_id || null,
        province_id: fields.province_id,
        district_zone: fields.district_zone || null,
        tennis_role: fields.tennis_role || null,
        note: fields.note || null,
        ...(password_hash ? { password_hash } : {}),
      },
      select: {
        id: true, full_name: true, email: true, phone: true, line_id: true,
        province_id: true, district_zone: true, tennis_role: true, status: true, note: true,
        created_at: true, approved_at: true, password_hash: true,
        province: { select: { id: true, name_th: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    const { password_hash: _hash, ...safe } = updated;
    void _hash;
    res.json({
      message: 'บันทึกข้อมูลเรียบร้อยแล้ว',
      ambassador: { ...safe, can_login: !!updated.password_hash },
    });
  } catch (err) {
    fail(res, err, 'update', 'บันทึกข้อมูลไม่สำเร็จ');
  }
});

const ApproveSchema = z.object({
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  /** Optional initial password — without one the account cannot sign in. */
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').max(72).optional().or(z.literal('')),
  note: z.string().max(2000).optional(),
});

// PATCH /api/ambassadors/:id/approve
router.patch('/:id/approve', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const parse = ApproveSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const { email, password, note } = parse.data;

    const target = await prisma.ambassador.findUnique({ where: { id } });
    if (!target) { res.status(404).json({ error: 'ไม่พบผู้สมัคร' }); return; }

    // Email doubles as the login identity across both account tables.
    const [adminClash, ambClash] = await Promise.all([
      prisma.admin.findFirst({ where: { email } }),
      prisma.ambassador.findFirst({ where: { email, NOT: { id } } }),
    ]);
    if (adminClash || ambClash) {
      res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
      return;
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : undefined;

    const updated = await prisma.ambassador.update({
      where: { id },
      data: {
        status: 'approved',
        email,
        approved_by: req.user!.id,
        approved_at: new Date(),
        ...(password_hash ? { password_hash } : {}),
        ...(note ? { note } : {}),
      },
      select: { id: true, full_name: true, email: true, status: true, password_hash: true },
    });

    res.json({
      message: 'อนุมัติเรียบร้อยแล้ว',
      id: updated.id,
      can_login: !!updated.password_hash,
    });
  } catch (err) {
    fail(res, err, 'approve', 'อนุมัติไม่สำเร็จ');
  }
});

const RejectSchema = z.object({ note: z.string().max(2000).optional() });

// PATCH /api/ambassadors/:id/reject
router.patch('/:id/reject', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: 'Invalid id' }); return; }

    const parse = RejectSchema.safeParse(req.body);
    if (!parse.success) { res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' }); return; }

    const target = await prisma.ambassador.findUnique({ where: { id } });
    if (!target) { res.status(404).json({ error: 'ไม่พบผู้สมัคร' }); return; }

    await prisma.ambassador.update({
      where: { id },
      data: { status: 'rejected', ...(parse.data.note ? { note: parse.data.note } : {}) },
    });
    res.json({ message: 'ปฏิเสธใบสมัครแล้ว' });
  } catch (err) {
    fail(res, err, 'reject', 'ดำเนินการไม่สำเร็จ');
  }
});

export default router;
