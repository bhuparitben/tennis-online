import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createDuplicateSubmission,
  getSubmission,
  verifySubmission,
  approveSubmission,
  listSubmissions,
} from '../controllers/submissionController.js';

const router = Router();

// All routes require auth
router.use(requireAuth);

router.get('/', listSubmissions);
router.get('/:id', getSubmission);
router.post('/duplicate', requireRole('ambassador'), createDuplicateSubmission);
router.patch('/:id/verify', requireRole('ambassador'), verifySubmission);
router.patch('/:id/approve', requireRole('admin'), approveSubmission);

export default router;
