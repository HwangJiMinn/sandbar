import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';
import type { NameAiInterpretation, NameRequest } from '~/lib/name-types';

// ─── 인터페이스 ────────────────────────────────────────────

export interface INameAiCache {
  userId: Types.ObjectId;
  cacheKey: string; // "${surname}|${givenName}|${gender}"
  input: NameRequest;
  interpretation: NameAiInterpretation | null; // null = AI 처리 중 (pending)
  model: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const nameAiCacheSchema = new Schema<INameAiCache>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cacheKey: { type: String, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    interpretation: { type: Schema.Types.Mixed, required: false, default: null },
    model: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

nameAiCacheSchema.index({ userId: 1, cacheKey: 1 }, { unique: true });
nameAiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── 모델 ──────────────────────────────────────────────────

if (db.models.NameAiCache) db.deleteModel('NameAiCache');
export const NameAiCache: Model<INameAiCache> = db.model<INameAiCache>(
  'NameAiCache',
  nameAiCacheSchema,
);

// ─── 캐시 키 생성 ──────────────────────────────────────────

export function makeNameCacheKey(
  surname: string,
  givenName: string,
  gender: string,
): string {
  return `${surname}|${givenName}|${gender}`;
}
