import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/provinces
router.get('/provinces', async (_req: Request, res: Response) => {
  const provinces = await prisma.province.findMany({
    orderBy: [{ region: 'asc' }, { name_th: 'asc' }],
    select: { id: true, name_th: true, name_en: true, region: true },
  });
  res.json(provinces);
});

// GET /api/districts?province_id=1
router.get('/districts', async (req: Request, res: Response) => {
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
});

// GET /api/surface-types
router.get('/surface-types', async (_req: Request, res: Response) => {
  const types = await prisma.surfaceType.findMany({ orderBy: { name: 'asc' } });
  res.json(types);
});

export default router;
