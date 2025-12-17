import express from 'express';
import {
  getProfile,
  updateProfile,
  updateProfileValidation,
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfileValidation, updateProfile);

export default router;
