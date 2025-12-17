import express from 'express';
import {
  getCurrentEvent,
  createEvent,
  updateEvent,
  getEventParticipants,
  joinEvent,
  createEventValidation,
  updateEventValidation,
} from '../controllers/eventController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = express.Router();

// Public/user routes
router.get('/current', authenticate, getCurrentEvent);
router.post('/join', authenticate, joinEvent);

// Admin routes
router.post('/', authenticate, authorizeAdmin, createEventValidation, createEvent);
router.put(
  '/:id',
  authenticate,
  authorizeAdmin,
  updateEventValidation,
  updateEvent
);
router.get('/:id/participants', authenticate, authorizeAdmin, getEventParticipants);

export default router;
