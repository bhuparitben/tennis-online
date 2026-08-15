import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  checkDuplicate,
  createCourt,
  updateCourt,
  getCourtById,
  getCourtForManage,
  listCourts,
} from '../controllers/courtController.js';

const router = Router();

// Public
router.get('/', listCourts);
router.get('/:id', getCourtById);

// Ambassador / Admin
router.post('/check-duplicate', requireAuth, requireRole('ambassador', 'admin'), checkDuplicate);
router.post('/', requireAuth, requireRole('ambassador', 'admin'), createCourt);
router.get('/:id/manage', requireAuth, requireRole('ambassador', 'admin'), getCourtForManage);
router.patch('/:id', requireAuth, requireRole('ambassador', 'admin'), updateCourt);

export default router;
