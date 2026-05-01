import type { Document, Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';

// ─── 인터페이스 ────────────────────────────────────────────

export interface IAdCredit extends Document {
  userId: Types.ObjectId;
  expiresAt: Date; // 크레딧 만료 시각
  totalAdsWatched: number; // 누적 시청 횟수
  lastWatchedAt: Date; // 마지막 광고 시청 시각
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const adCreditSchema = new Schema<IAdCredit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // 유저당 1개 문서 (upsert로 관리)
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true, // 만료 여부 쿼리 최적화
    },
    totalAdsWatched: {
      type: Number,
      default: 1,
      min: 0,
    },
    lastWatchedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// ─── 모델 ──────────────────────────────────────────────────

export const AdCredit: Model<IAdCredit> =
  db.models.AdCredit ?? db.model<IAdCredit>('AdCredit', adCreditSchema);
