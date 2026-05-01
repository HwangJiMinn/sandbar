import type { Document, Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';

// ─── 인터페이스 ────────────────────────────────────────────

export interface ISavedSaju extends Document {
  userId: Types.ObjectId;
  label: string; // 프로필 별칭 (예: "나", "엄마", "남자친구")
  name: string;
  gender: '남' | '여';
  year: number;
  month: number;
  day: number;
  hour: number | null; // null = 시간 모름
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const savedSajuSchema = new Schema<ISavedSaju>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    gender: {
      type: String,
      enum: ['남', '여'],
      required: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: 2100,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    hour: {
      type: Number,
      default: null,
      min: 0,
      max: 23,
    },
  },
  {
    timestamps: true,
  },
);

// ─── 모델 ──────────────────────────────────────────────────

export const SavedSaju: Model<ISavedSaju> =
  db.models.SavedSaju ?? db.model<ISavedSaju>('SavedSaju', savedSajuSchema);
