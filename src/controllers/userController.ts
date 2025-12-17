import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import Event from '../models/Event';

// Validation rules
export const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('wishlist.wishText').optional().isString(),
  body('wishlist.link').optional().isURL().withMessage('Must be a valid URL'),
];

// Get current user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId).populate('eventId');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        wishlist: user.wishlist,
        event: user.eventId,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update user profile and wishlist
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { name, wishlist } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if registration is still open
    if (user.eventId) {
      const event = await Event.findById(user.eventId);
      if (event && event.status === 'assigned') {
        // Can still update name, but not wishlist after assignment
        if (wishlist) {
          res.status(400).json({
            message: 'Cannot update wishlist after assignments have been made',
          });
          return;
        }
      }
    }

    // Update fields
    if (name) user.name = name;
    if (wishlist) {
      user.wishlist = {
        wishText: wishlist.wishText || user.wishlist.wishText,
        link: wishlist.link || user.wishlist.link,
      };
    }

    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        wishlist: user.wishlist,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};
