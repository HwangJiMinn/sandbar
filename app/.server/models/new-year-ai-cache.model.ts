import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';
import type { NewYearAiInterpretation } from '~/lib/new-year-types';
import type { SajuRequest } from '~/lib/saju-types';

// ─── 인터페이스 ────────────────────────────────────────────

export interface INewYearAiCache {
  userId: Types.ObjectId;
  cacheKey: string; // "${year}|${month}|${day}|${hour}|${gender}|${targetYear}"
  input: SajuRequest;
  targetYear: number;
  interpretation: NewYearAiInterpretation | null; // null = pending
  model: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const newYearAiCacheSchema = new Schema<INewYearAiCache>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cacheKey: { type: String, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    targetYear: { type: Number, required: true },
    interpretation: { type: Schema.Types.Mixed, default: null },
    model: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

newYearAiCacheSchema.index({ userId: 1, cacheKey: 1 }, { unique: true });
newYearAiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── 모델 ──────────────────────────────────────────────────

if (db.models.NewYearAiCache) db.deleteModel('NewYearAiCache');
export const NewYearAiCache: Model<INewYearAiCache> = db.model<INewYearAiCache>(
  'NewYearAiCache',
  newYearAiCacheSchema,
);

// ─── 캐시 키 ───────────────────────────────────────────────

export function makeNewYearCacheKey(
  year: number,
  month: number,
  day: number,
  hour: number | null,
  gender: string,
  targetYear: number,
): string {
  return `${year}|${month}|${day}|${hour ?? -1}|${gender}|${targetYear}`;
}
