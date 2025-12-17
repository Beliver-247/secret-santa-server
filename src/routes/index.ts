import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import eventRoutes from './eventRoutes';
import assignmentRoutes from './assignmentRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/events', assignmentRoutes);

export default router;
