import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Event from '../models/Event';
import User from '../models/User';
import mongoose from 'mongoose';

// Validation rules
export const createEventValidation = [
  body('name').trim().notEmpty().withMessage('Event name is required'),
  body('budgetLimit')
    .isNumeric()
    .withMessage('Budget limit must be a number')
    .isFloat({ min: 0 })
    .withMessage('Budget limit must be positive'),
  body('registrationDeadline')
    .isISO8601()
    .withMessage('Valid date is required')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Registration deadline must be in the future');
      }
      return true;
    }),
];

export const updateEventValidation = [
  body('name').optional().trim().notEmpty().withMessage('Event name cannot be empty'),
  body('budgetLimit')
    .optional()
    .isNumeric()
    .withMessage('Budget limit must be a number')
    .isFloat({ min: 0 })
    .withMessage('Budget limit must be positive'),
  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Valid date is required'),
  body('status')
    .optional()
    .isIn(['draft', 'open', 'closed', 'assigned'])
    .withMessage('Invalid status'),
];

// Get current event (available to all authenticated users)
export const getCurrentEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Find the most recent open or assigned event
    const event = await Event.findOne({
      status: { $in: ['open', 'closed', 'assigned'] },
    }).sort({ createdAt: -1 });

    if (!event) {
      res.status(404).json({ message: 'No active event found' });
      return;
    }

    // Count participants
    const participantCount = await User.countDocuments({ eventId: event._id });

    res.json({
      event: {
        id: event._id,
        name: event.name,
        budgetLimit: event.budgetLimit,
        registrationDeadline: event.registrationDeadline,
        status: event.status,
        participantCount,
      },
    });
  } catch (error) {
    console.error('Get current event error:', error);
    res.status(500).json({ message: 'Error fetching event' });
  }
};

// Create new event (admin only)
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, budgetLimit, registrationDeadline } = req.body;

    const event = await Event.create({
      name,
      budgetLimit,
      registrationDeadline: new Date(registrationDeadline),
      status: 'open',
    });

    res.status(201).json({
      event: {
        id: event._id,
        name: event.name,
        budgetLimit: event.budgetLimit,
        registrationDeadline: event.registrationDeadline,
        status: event.status,
      },
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
};

// Update event (admin only)
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { name, budgetLimit, registrationDeadline, status } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Update fields
    if (name) event.name = name;
    if (budgetLimit !== undefined) event.budgetLimit = budgetLimit;
    if (registrationDeadline)
      event.registrationDeadline = new Date(registrationDeadline);
    if (status) event.status = status;

    await event.save();

    res.json({
      event: {
        id: event._id,
        name: event.name,
        budgetLimit: event.budgetLimit,
        registrationDeadline: event.registrationDeadline,
        status: event.status,
      },
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
};

// Get event participants (admin only)
export const getEventParticipants = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const participants = await User.find({ eventId: id }).select(
      'name email wishlist createdAt'
    );

    res.json({
      participants: participants.map((p) => ({
        id: p._id,
        name: p.name,
        email: p.email,
        wishlist: p.wishlist,
        registeredAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Error fetching participants' });
  }
};

// Join event (user joins the current open event)
export const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // Find the current open event
    const event = await Event.findOne({ status: 'open' }).sort({ createdAt: -1 });
    if (!event) {
      res.status(404).json({ message: 'No open event to join' });
      return;
    }

    // Check if registration deadline has passed
    if (new Date() > event.registrationDeadline) {
      res.status(400).json({ message: 'Registration deadline has passed' });
      return;
    }

    // Update user's eventId
    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.eventId?.toString() === event._id.toString()) {
      res.status(400).json({ message: 'Already joined this event' });
      return;
    }

    user.eventId = event._id as mongoose.Types.ObjectId;
    await user.save();

    res.json({
      message: 'Successfully joined event',
      event: {
        id: event._id,
        name: event.name,
        budgetLimit: event.budgetLimit,
        registrationDeadline: event.registrationDeadline,
      },
    });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ message: 'Error joining event' });
  }
};
