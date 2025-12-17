import express from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  getCurrentUser,
  googleCallback,
  registerValidation,
  loginValidation,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Email/password auth
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);

// Get current user
router.get('/me', authenticate, getCurrentUser);

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

export default router;
