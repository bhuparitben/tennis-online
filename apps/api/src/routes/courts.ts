import { Router } from 'express';
import { requireAuth, requireRole, requireActiveAmbassador } from '../middleware/auth.js';
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

// Ambassador / Admin — check-duplicate and /manage are read-only, so a
// rejected/blocked ambassador can still use them; create/edit are gated.
router.post('/check-duplicate', requireAuth, requireRole('ambassador', 'admin'), checkDuplicate);
router.post('/', requireAuth, requireRole('ambassador', 'admin'), requireActiveAmbassador, createCourt);
router.get('/:id/manage', requireAuth, requireRole('ambassador', 'admin'), getCourtForManage);
router.patch('/:id', requireAuth, requireRole('ambassador', 'admin'), requireActiveAmbassador, updateCourt);

export default router;
