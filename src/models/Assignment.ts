import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignment extends Document {
  eventId: mongoose.Types.ObjectId;
  santaUserId: mongoose.Types.ObjectId;
  receiverUserId: mongoose.Types.ObjectId;
  receiverNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    santaUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Santa user ID is required'],
    },
    receiverUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver user ID is required'],
    },
    receiverNumber: {
      type: Number,
      required: [true, 'Receiver number is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness
AssignmentSchema.index({ eventId: 1, receiverNumber: 1 }, { unique: true });
AssignmentSchema.index({ eventId: 1, santaUserId: 1 }, { unique: true });
AssignmentSchema.index({ eventId: 1, receiverUserId: 1 }, { unique: true });

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
