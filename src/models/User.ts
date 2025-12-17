import mongoose, { Document, Schema } from 'mongoose';

export interface IWishlist {
  wishText: string;
  link?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: 'user' | 'admin';
  wishlist: IWishlist;
  eventId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>({
  wishText: {
    type: String,
    default: '',
  },
  link: {
    type: String,
    default: '',
  },
});

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: 'Please provide a valid email address',
      },
    },
    passwordHash: {
      type: String,
      select: false, // Don't return password hash by default
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    wishlist: {
      type: WishlistSchema,
      default: () => ({ wishText: '', link: '' }),
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
// Unique and sparse constraints already create indexes; no extra indexes needed

export default mongoose.model<IUser>('User', UserSchema);
