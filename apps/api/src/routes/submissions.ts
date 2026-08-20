import { Router } from 'express';
import { requireAuth, requireRole, requireActiveAmbassador } from '../middleware/auth.js';
import {
  createDuplicateSubmission,
  getSubmission,
  verifySubmission,
  approveSubmission,
  listSubmissions,
  updateSubmissionField,
  deleteSubmission,
} from '../controllers/submissionController.js';

const router = Router();

// All routes require auth
router.use(requireAuth);

// Read-only — left open to rejected/blocked ambassadors so they can still
// see their own history.
router.get('/', listSubmissions);
router.get('/:id', getSubmission);
// Mutating — a rejected/blocked ambassador is refused here regardless of
// what the UI shows (admin is unaffected by requireActiveAmbassador).
router.post('/duplicate', requireRole('ambassador', 'admin'), requireActiveAmbassador, createDuplicateSubmission);
router.patch('/:id/field', requireRole('ambassador'), requireActiveAmbassador, updateSubmissionField);
router.patch('/:id/verify', requireRole('ambassador'), requireActiveAmbassador, verifySubmission);
router.patch('/:id/approve', requireRole('admin'), approveSubmission);
router.delete('/:id', requireRole('ambassador', 'admin'), requireActiveAmbassador, deleteSubmission);

export default router;
