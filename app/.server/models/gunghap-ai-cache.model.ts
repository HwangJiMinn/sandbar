import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';
import type { GunghapAiInterpretation, PersonInfo } from '~/lib/gunghap-types';

// ─── 인터페이스 ────────────────────────────────────────────

export interface IGunghapAiCache {
  userId: Types.ObjectId;
  cacheKey: string;
  meInput: PersonInfo; // 새로고침 복원용
  partnerInput: PersonInfo; // 새로고침 복원용
  interpretation: GunghapAiInterpretation | null; // null = AI 처리 중 (pending)
  model: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const gunghapAiCacheSchema = new Schema<IGunghapAiCache>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cacheKey: { type: String, required: true },
    meInput: { type: Schema.Types.Mixed, required: true },
    partnerInput: { type: Schema.Types.Mixed, required: true },
    interpretation: { type: Schema.Types.Mixed, required: false, default: null }, // pending 허용
    model: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

gunghapAiCacheSchema.index({ userId: 1, cacheKey: 1 }, { unique: true });
gunghapAiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── 모델 ──────────────────────────────────────────────────

// 스키마 변경 시 캐시된 모델을 교체
if (db.models.GunghapAiCache) db.deleteModel('GunghapAiCache');
export const GunghapAiCache: Model<IGunghapAiCache> = db.model<IGunghapAiCache>(
  'GunghapAiCache',
  gunghapAiCacheSchema,
);

// ─── 캐시 키 생성 ──────────────────────────────────────────

export function makeGunghapCacheKey(
  me: { year: number; month: number; day: number; hour: number | null; gender: string },
  partner: {
    year: number;
    month: number;
    day: number;
    hour: number | null;
    gender: string;
  },
): string {
  const p = (x: typeof me) => `${x.year}|${x.month}|${x.day}|${x.hour ?? -1}|${x.gender}`;
  return `me:${p(me)}-partner:${p(partner)}`;
}
