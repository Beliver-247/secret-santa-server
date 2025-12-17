import mongoose, { Document, Schema } from 'mongoose';

export type EventStatus = 'draft' | 'open' | 'closed' | 'assigned';

export interface IEvent extends Document {
  name: string;
  budgetLimit: number;
  registrationDeadline: Date;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
    },
    budgetLimit: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [0, 'Budget limit must be a positive number'],
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed', 'assigned'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
EventSchema.index({ status: 1 });
EventSchema.index({ registrationDeadline: 1 });

export default mongoose.model<IEvent>('Event', EventSchema);
