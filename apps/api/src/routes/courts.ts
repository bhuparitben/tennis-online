import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  checkDuplicate,
  createCourt,
  getCourtById,
  listCourts,
} from '../controllers/courtController.js';

const router = Router();

// Public
router.get('/', listCourts);
router.get('/:id', getCourtById);

// Ambassador
router.post('/check-duplicate', requireAuth, requireRole('ambassador', 'admin'), checkDuplicate);
router.post('/', requireAuth, requireRole('ambassador'), createCourt);

export default router;
