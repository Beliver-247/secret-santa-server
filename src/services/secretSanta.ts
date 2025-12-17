import mongoose from 'mongoose';
import Assignment from '../models/Assignment';
import Event from '../models/Event';
import User from '../models/User';

/**
 * Fisher-Yates shuffle algorithm
 * Used to randomize the array
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Check if an array is a valid derangement
 * (no element is in its original position)
 */
const isDerangement = (original: string[], shuffled: string[]): boolean => {
  for (let i = 0; i < original.length; i++) {
    if (original[i] === shuffled[i]) {
      return false;
    }
  }
  return true;
};

/**
 * Generate a random derangement of the input array
 * A derangement is a permutation where no element appears in its original position
 * This ensures no one is assigned to themselves
 */
const generateDerangement = <T>(array: T[], maxAttempts = 1000): T[] => {
  if (array.length < 2) {
    throw new Error('Need at least 2 participants for Secret Santa');
  }

  // For 2 participants, there's only one derangement: swap them
  if (array.length === 2) {
    return [array[1], array[0]];
  }

  const originalIndices = array.map((_, i) => i.toString());
  let attempts = 0;

  while (attempts < maxAttempts) {
    const shuffled = shuffleArray(array);
    const shuffledIndices = array.map((item) => array.indexOf(item).toString());

    if (isDerangement(originalIndices, shuffledIndices)) {
      return shuffled;
    }

    attempts++;
  }

  // Fallback algorithm if random shuffle fails
  // This creates a cyclic shift which is guaranteed to be a derangement
  const result = [...array];
  const last = result.pop()!;
  result.unshift(last);
  return result;
};

/**
 * Assign Secret Santa participants
 * Creates assignments where:
 * - No one is assigned to themselves
 * - Each person is assigned exactly once as a receiver
 * - Each assignment gets a unique number
 */
export const assignSecretSanta = async (
  eventId: mongoose.Types.ObjectId
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get the event
    const event = await Event.findById(eventId).session(session);
    if (!event) {
      throw new Error('Event not found');
    }

    // Get all participants for this event
    const participants = await User.find({ eventId }).session(session);

    if (participants.length < 2) {
      throw new Error('Need at least 2 participants for Secret Santa');
    }

    // Delete existing assignments for this event (if re-running)
    await Assignment.deleteMany({ eventId }).session(session);

    // Create arrays for assignment
    const santas = [...participants];
    const receivers = generateDerangement(participants);

    // Generate unique numbers for receivers
    const numbers = Array.from({ length: participants.length }, (_, i) => i + 1);
    const shuffledNumbers = shuffleArray(numbers);

    // Create assignments
    const assignments = santas.map((santa, index) => ({
      eventId,
      santaUserId: santa._id,
      receiverUserId: receivers[index]._id,
      receiverNumber: shuffledNumbers[index],
    }));

    // Save all assignments
    await Assignment.insertMany(assignments, { session });

    // Update event status
    event.status = 'assigned';
    await event.save({ session });

    await session.commitTransaction();
    console.log(`✅ Successfully assigned ${assignments.length} Secret Santa pairs`);
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error assigning Secret Santa:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get assignment for a specific user
 * Returns the receiver's number and wishlist (but not their identity)
 */
export const getUserAssignment = async (
  eventId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
) => {
  const assignment = await Assignment.findOne({
    eventId,
    santaUserId: userId,
  }).populate('receiverUserId', 'wishlist');

  if (!assignment) {
    return null;
  }

  return {
    receiverNumber: assignment.receiverNumber,
    receiverWishlist: (assignment.receiverUserId as any).wishlist,
  };
};

/**
 * Get all assignments for an event (admin only)
 * Returns complete mapping with participant details
 */
export const getAllAssignments = async (eventId: mongoose.Types.ObjectId) => {
  const assignments = await Assignment.find({ eventId })
    .populate('santaUserId', 'name email wishlist')
    .populate('receiverUserId', 'name email wishlist')
    .sort({ receiverNumber: 1 });

  return assignments.map((assignment) => ({
    santa: {
      id: (assignment.santaUserId as any)._id,
      name: (assignment.santaUserId as any).name,
      email: (assignment.santaUserId as any).email,
      wishlist: (assignment.santaUserId as any).wishlist,
    },
    receiver: {
      id: (assignment.receiverUserId as any)._id,
      name: (assignment.receiverUserId as any).name,
      email: (assignment.receiverUserId as any).email,
      wishlist: (assignment.receiverUserId as any).wishlist,
    },
    receiverNumber: assignment.receiverNumber,
  }));
};
