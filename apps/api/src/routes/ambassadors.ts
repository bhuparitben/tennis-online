import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/ambassadors/me — own profile
router.get('/me', requireAuth, requireRole('ambassador'), async (req: Request, res: Response) => {
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
});

// GET /api/ambassadors/:id — admin only
router.get('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const amb = await prisma.ambassador.findUnique({
    where: { id },
    include: { province: true, approvedBy: { select: { id: true, name: true } } },
  });
  if (!amb) { res.status(404).json({ error: 'Not found' }); return; }

  const { password_hash, ...safe } = amb;
  void password_hash;
  res.json(safe);
});

// GET /api/ambassadors — admin list
router.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const ambassadors = await prisma.ambassador.findMany({
    select: {
      id: true, full_name: true, province: { select: { name_th: true } },
      phone: true, tennis_role: true, status: true, created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
  res.json(ambassadors);
});

// PATCH /api/ambassadors/:id/approve — admin approves
router.patch('/:id/approve', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { email, note } = req.body as { email?: string; note?: string };

  await prisma.ambassador.update({
    where: { id },
    data: {
      status: 'approved',
      approved_by: req.user!.id,
      approved_at: new Date(),
      ...(email ? { email } : {}),
      ...(note ? { note } : {}),
    },
  });
  res.json({ message: 'Ambassador approved' });
});

export default router;
