import express from 'express';
import {
  triggerAssignment,
  getMyAssignment,
  getAssignments,
  exportAssignmentsCSV,
} from '../controllers/assignmentController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = express.Router();

// User route
router.get('/:id/assignments/me', authenticate, getMyAssignment);

// Admin routes
router.post('/:id/assign', authenticate, authorizeAdmin, triggerAssignment);
router.get('/:id/assignments', authenticate, authorizeAdmin, getAssignments);
router.get(
  '/:id/assignments/export',
  authenticate,
  authorizeAdmin,
  exportAssignmentsCSV
);

export default router;
