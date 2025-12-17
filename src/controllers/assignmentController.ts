import { Request, Response } from 'express';
import Event from '../models/Event';
import {
  assignSecretSanta,
  getUserAssignment,
  getAllAssignments,
} from '../services/secretSanta';
import mongoose from 'mongoose';

// Trigger Secret Santa assignment (admin only)
export const triggerAssignment = async (
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

    if (event.status === 'assigned') {
      res.status(400).json({ message: 'Assignments already completed for this event' });
      return;
    }

    // Perform assignment
    await assignSecretSanta(event._id as mongoose.Types.ObjectId);

    res.json({
      message: 'Secret Santa assignments completed successfully',
    });
  } catch (error: any) {
    console.error('Assignment error:', error);
    res.status(500).json({
      message: error.message || 'Error creating assignments',
    });
  }
};

// Get user's assignment (user)
export const getMyAssignment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    if (event.status !== 'assigned') {
      res.status(400).json({
        message: 'Assignments have not been completed yet',
      });
      return;
    }

    const assignment = await getUserAssignment(
      event._id as mongoose.Types.ObjectId,
      new mongoose.Types.ObjectId(req.user.userId)
    );

    if (!assignment) {
      res.status(404).json({
        message: 'No assignment found. Make sure you joined the event.',
      });
      return;
    }

    res.json({
      assignment: {
        receiverNumber: assignment.receiverNumber,
        receiverWishlist: assignment.receiverWishlist,
      },
    });
  } catch (error) {
    console.error('Get my assignment error:', error);
    res.status(500).json({ message: 'Error fetching assignment' });
  }
};

// Get all assignments (admin only)
export const getAssignments = async (
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

    if (event.status !== 'assigned') {
      res.status(400).json({
        message: 'Assignments have not been completed yet',
      });
      return;
    }

    const assignments = await getAllAssignments(event._id as mongoose.Types.ObjectId);

    res.json({
      assignments,
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Error fetching assignments' });
  }
};

// Export assignments as CSV (admin only)
export const exportAssignmentsCSV = async (
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

    if (event.status !== 'assigned') {
      res.status(400).json({
        message: 'Assignments have not been completed yet',
      });
      return;
    }

    const assignments = await getAllAssignments(event._id as mongoose.Types.ObjectId);

    // Create CSV content
    const csvHeader =
      'Santa Name,Santa Email,Receiver Number,Receiver Name,Receiver Email,Receiver Wishlist\n';
    const csvRows = assignments
      .map((a) => {
        const santaName = a.santa.name.replace(/,/g, ' ');
        const santaEmail = a.santa.email;
        const receiverNumber = a.receiverNumber;
        const receiverName = a.receiver.name.replace(/,/g, ' ');
        const receiverEmail = a.receiver.email;
        const wishlistText = a.receiver.wishlist.wishText.replace(/,/g, ' ');

        return `${santaName},${santaEmail},${receiverNumber},${receiverName},${receiverEmail},"${wishlistText}"`;
      })
      .join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="secret-santa-${event.name}-assignments.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Error exporting assignments' });
  }
};
