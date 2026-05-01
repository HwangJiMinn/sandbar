import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';
import type { AiInterpretation, SajuRequest } from '~/lib/saju-types';

// ─── 인터페이스 ────────────────────────────────────────────

export interface ISajuAiCache {
  userId: Types.ObjectId;
  cacheKey: string; // "${year}|${month}|${day}|${hour}|${gender}"
  input: SajuRequest; // 새로고침 복원용
  interpretation: AiInterpretation | null; // null = AI 처리 중 (pending)
  model: string;
  expiresAt: Date; // 24시간 후 자동 삭제
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const sajuAiCacheSchema = new Schema<ISajuAiCache>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cacheKey: { type: String, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    interpretation: { type: Schema.Types.Mixed, required: false, default: null }, // pending 허용
    model: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// 유저별 동일 입력에 대해 유일한 캐시
sajuAiCacheSchema.index({ userId: 1, cacheKey: 1 }, { unique: true });
// TTL 인덱스 — expiresAt 이후 즉시 삭제
sajuAiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── 모델 ──────────────────────────────────────────────────

// 스키마 변경 시 캐시된 모델을 교체
if (db.models.SajuAiCache) db.deleteModel('SajuAiCache');
export const SajuAiCache: Model<ISajuAiCache> = db.model<ISajuAiCache>(
  'SajuAiCache',
  sajuAiCacheSchema,
);

// ─── 캐시 키 생성 ──────────────────────────────────────────

export function makeSajuCacheKey(
  year: number,
  month: number,
  day: number,
  hour: number | null,
  gender: string,
): string {
  return `${year}|${month}|${day}|${hour ?? -1}|${gender}`;
}
