import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken, requireAuth, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

const router = Router();

/** Maps a thrown error onto a response, keeping DB outages distinguishable. */
function fail(res: Response, err: unknown, label: string, generic: string) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[auth/${label}]`, msg);
  if (msg.includes('Authentication failed') || msg.includes('ECONNREFUSED') || msg.includes('P1001')) {
    res.status(503).json({ error: 'Database unavailable — check DATABASE_URL credentials' });
  } else {
    res.status(500).json({ error: generic });
  }
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'ambassador']),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid input', details: parse.error.flatten(), issues: parse.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
      return;
    }

    const { email, password, role } = parse.data;

    if (role === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      const token = signToken({ id: admin.id, role: 'admin', email: admin.email });
      setAuthCookie(res, token);
      res.json({ user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } });
      return;
    }

    // Ambassador
    const ambassador = await prisma.ambassador.findUnique({
      where: { email },
      include: { province: { select: { name_th: true } } },
    });
    if (!ambassador) {
      res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    // Applicants register with an email but no password, so they will try to
    // sign in before approval. Say why instead of "invalid credentials".
    if (!ambassador.password_hash) {
      const reason =
        ambassador.status === 'rejected'
          ? 'ใบสมัครของคุณไม่ได้รับการอนุมัติ กรุณาติดต่อทีมงาน'
          : ambassador.status === 'approved'
            ? 'บัญชีได้รับอนุมัติแล้วแต่ยังไม่ได้ตั้งรหัสผ่าน กรุณาติดต่อทีมงาน'
            : 'ใบสมัครของคุณอยู่ระหว่างรอการอนุมัติ ยังไม่สามารถเข้าสู่ระบบได้';
      res.status(403).json({ error: reason, status: ambassador.status });
      return;
    }

    if (!(await bcrypt.compare(password, ambassador.password_hash))) {
      res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }
    // Pending is the only status still blocked at login — they've never
    // been reviewed, so there's nothing of theirs to show yet. Rejected and
    // blocked ambassadors DO get a session: they land in a read-only view
    // (every write route re-checks status server-side regardless), see
    // their own past submissions, and — for rejected — the reason why.
    if (ambassador.status === 'pending') {
      res.status(403).json({ error: 'ใบสมัครของคุณอยู่ระหว่างรอการอนุมัติ', status: ambassador.status });
      return;
    }

    const token = signToken({ id: ambassador.id, role: 'ambassador', email: ambassador.email! });
    setAuthCookie(res, token);
    res.json({
      user: {
        id: ambassador.id,
        name: ambassador.full_name,
        email: ambassador.email,
        role: 'ambassador',
        province_id: ambassador.province_id,
        province_name: ambassador.province?.name_th,
        status: ambassador.status,
        reject_reason: ambassador.reject_reason,
      },
    });
  } catch (err: unknown) {
    fail(res, err, 'login', 'Login failed');
  }
});

// POST /api/auth/register-interest  (Ambassador signup form — no auth needed)
router.post('/register-interest', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      full_name: z.string().min(2, 'กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน').max(150),
      // Collected up front so an approving admin already has the login identity.
      email: z.string().email('อีเมลไม่ถูกต้อง').max(150),
      // Set at signup time so the applicant can log in the moment they're
      // approved — login itself still gates on status === 'approved', so
      // there's no security downside to collecting it early.
      password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').max(72),
      province_id: z.number().int().positive('กรุณาเลือกจังหวัด'),
      district_zone: z.string().max(100).optional(),
      tennis_role: z.string().max(50).optional(),
      phone: z.string().max(20).optional(),
      line_id: z.string().max(100).optional(),
      consent_accepted: z.boolean(),
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    if (!parse.data.consent_accepted) {
      res.status(400).json({ error: 'กรุณายอมรับเงื่อนไขการเก็บข้อมูล' });
      return;
    }

    const email = parse.data.email.trim().toLowerCase();

    // Email is the login identity across both account tables.
    const [adminClash, ambClash] = await Promise.all([
      prisma.admin.findFirst({ where: { email } }),
      prisma.ambassador.findFirst({ where: { email } }),
    ]);
    if (adminClash || ambClash) {
      res.status(409).json({ error: 'อีเมลนี้เคยลงทะเบียนไว้แล้ว หากต้องการติดตามสถานะกรุณาติดต่อทีมงาน' });
      return;
    }

    // Province must exist, otherwise the insert fails on the FK with a 500.
    const province = await prisma.province.findUnique({ where: { id: parse.data.province_id } });
    if (!province) {
      res.status(400).json({ error: 'ไม่พบจังหวัดที่เลือก' });
      return;
    }

    const { password, ...rest } = parse.data;
    const password_hash = await bcrypt.hash(password, 10);

    const ambassador = await prisma.ambassador.create({
      data: { ...rest, email, password_hash, status: 'pending' },
    });

    res.status(201).json({ id: ambassador.id, message: 'Registration received. Admin will contact you.' });
  } catch (err: unknown) {
    fail(res, err, 'register-interest', 'Registration failed');
  }
});

// POST /api/auth/logout — clears the HttpOnly cookie server-side; JS can't
// delete it itself, so this endpoint is the only way to end a session early.
router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: 'ออกจากระบบแล้ว' });
});

// ===== Profile =====

/** Shapes an admin/ambassador row into the profile the client renders. */
async function loadProfile(id: number, role: 'admin' | 'ambassador') {
  if (role === 'admin') {
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, created_at: true },
    });
    if (!admin) return null;
    return {
      id: admin.id,
      role: 'admin' as const,
      full_name: admin.name,
      email: admin.email,
      created_at: admin.created_at,
    };
  }

  const amb = await prisma.ambassador.findUnique({
    where: { id },
    select: {
      id: true, full_name: true, email: true, phone: true, line_id: true,
      province_id: true, district_zone: true, tennis_role: true,
      status: true, reject_reason: true, created_at: true,
      province: { select: { name_th: true } },
    },
  });
  if (!amb) return null;
  return {
    id: amb.id,
    role: 'ambassador' as const,
    full_name: amb.full_name,
    email: amb.email,
    phone: amb.phone,
    line_id: amb.line_id,
    province_id: amb.province_id,
    province_name: amb.province?.name_th ?? null,
    district_zone: amb.district_zone,
    tennis_role: amb.tennis_role,
    status: amb.status,
    reject_reason: amb.reject_reason,
    created_at: amb.created_at,
  };
}

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, role } = req.user!;
    const profile = await loadProfile(id, role);
    if (!profile) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json(profile);
  } catch (err: unknown) {
    fail(res, err, 'me', 'Could not load profile');
  }
});

const ProfileSchema = z.object({
  full_name: z.string().min(2, 'ชื่อสั้นเกินไป').max(150),
  email: z.string().email('อีเมลไม่ถูกต้อง'),
  phone: z.string().max(20).optional().nullable(),
  line_id: z.string().max(100).optional().nullable(),
  province_id: z.number().int().positive().optional(),
  district_zone: z.string().max(100).optional().nullable(),
  tennis_role: z.string().max(50).optional().nullable(),
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, role } = req.user!;
    const parse = ProfileSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง', details: parse.error.flatten(), issues: parse.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
      return;
    }
    const d = parse.data;

    // Email is the login identity for both tables — keep it unique.
    const [adminClash, ambClash] = await Promise.all([
      prisma.admin.findFirst({ where: { email: d.email, NOT: role === 'admin' ? { id } : undefined } }),
      prisma.ambassador.findFirst({ where: { email: d.email, NOT: role === 'ambassador' ? { id } : undefined } }),
    ]);
    if (adminClash || ambClash) {
      res.status(409).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
      return;
    }

    if (role === 'admin') {
      await prisma.admin.update({
        where: { id },
        data: { name: d.full_name, email: d.email },
      });
    } else {
      await prisma.ambassador.update({
        where: { id },
        data: {
          full_name: d.full_name,
          email: d.email,
          phone: d.phone ?? null,
          line_id: d.line_id ?? null,
          district_zone: d.district_zone ?? null,
          tennis_role: d.tennis_role ?? null,
          ...(d.province_id ? { province_id: d.province_id } : {}),
        },
      });
    }

    const profile = await loadProfile(id, role);
    // Email lives in the token, so re-issue the session cookie after an
    // email change — the client never sees the token itself.
    const token = signToken({ id, role, email: d.email });
    setAuthCookie(res, token);
    res.json({ profile });
  } catch (err: unknown) {
    fail(res, err, 'me:patch', 'บันทึกข้อมูลไม่สำเร็จ');
  }
});

const PasswordSchema = z.object({
  current_password: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
  new_password: z.string().min(8, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร').max(72),
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, role } = req.user!;
    const parse = PasswordSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
      return;
    }
    const { current_password, new_password } = parse.data;

    if (current_password === new_password) {
      res.status(400).json({ error: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' });
      return;
    }

    const account =
      role === 'admin'
        ? await prisma.admin.findUnique({ where: { id }, select: { password_hash: true } })
        : await prisma.ambassador.findUnique({ where: { id }, select: { password_hash: true } });

    if (!account?.password_hash) {
      res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้' });
      return;
    }
    if (!(await bcrypt.compare(current_password, account.password_hash))) {
      res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    if (role === 'admin') {
      await prisma.admin.update({ where: { id }, data: { password_hash } });
    } else {
      await prisma.ambassador.update({ where: { id }, data: { password_hash } });
    }

    res.json({ message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
  } catch (err: unknown) {
    fail(res, err, 'change-password', 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
  }
});

export default router;
