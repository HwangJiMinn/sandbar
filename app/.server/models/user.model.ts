import type { Document, Model } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';

// ─── 인터페이스 ────────────────────────────────────────────

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  isVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiry: Date | null;
  tokenBalance: number; // 보유 토큰 (1토큰 = 1원)
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
    tokenBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.verificationToken;
        delete ret.verificationTokenExpiry;
        return ret;
      },
    },
  },
);

// ─── 모델 ──────────────────────────────────────────────────

export const User: Model<IUser> = db.models.User ?? db.model<IUser>('User', userSchema);
