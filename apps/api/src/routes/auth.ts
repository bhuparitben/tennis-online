import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../middleware/auth.js';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'ambassador']),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
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
    res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' } });
    return;
  }

  // Ambassador
  const ambassador = await prisma.ambassador.findUnique({ where: { email } });
  if (!ambassador || !ambassador.password_hash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  if (!(await bcrypt.compare(password, ambassador.password_hash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  if (ambassador.status !== 'approved') {
    res.status(403).json({ error: 'Ambassador account is not approved yet', status: ambassador.status });
    return;
  }

  const token = signToken({ id: ambassador.id, role: 'ambassador', email: ambassador.email! });
  res.json({
    token,
    user: {
      id: ambassador.id,
      name: ambassador.full_name,
      email: ambassador.email,
      role: 'ambassador',
      province_id: ambassador.province_id,
    },
  });
});

// POST /api/auth/register-interest  (Ambassador signup form — no auth needed)
router.post('/register-interest', async (req: Request, res: Response) => {
  const schema = z.object({
    full_name: z.string().min(2),
    province_id: z.number().int().positive(),
    district_zone: z.string().optional(),
    tennis_role: z.string().optional(),
    phone: z.string().optional(),
    line_id: z.string().optional(),
    consent_accepted: z.boolean(),
  });

  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten() });
    return;
  }
  if (!parse.data.consent_accepted) {
    res.status(400).json({ error: 'Consent is required' });
    return;
  }

  const ambassador = await prisma.ambassador.create({
    data: { ...parse.data, status: 'pending' },
  });

  res.status(201).json({ id: ambassador.id, message: 'Registration received. Admin will contact you.' });
});

export default router;
