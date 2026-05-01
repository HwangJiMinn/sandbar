import type { Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';
import type { LifetimeAiInterpretation, LifetimeRequest } from '~/lib/lifetime-types';

export interface ILifetimeAiCache {
  userId: Types.ObjectId;
  cacheKey: string;
  input: LifetimeRequest;
  interpretation: LifetimeAiInterpretation | null;
  model: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ILifetimeAiCache>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cacheKey: { type: String, required: true },
    input: { type: Schema.Types.Mixed, required: true },
    interpretation: { type: Schema.Types.Mixed, default: null },
    model: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

schema.index({ userId: 1, cacheKey: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

if (db.models.LifetimeAiCache) db.deleteModel('LifetimeAiCache');
export const LifetimeAiCache: Model<ILifetimeAiCache> = db.model<ILifetimeAiCache>(
  'LifetimeAiCache',
  schema,
);

export function makeLifetimeCacheKey(
  year: number,
  month: number,
  day: number,
  hour: number | null,
  gender: string,
): string {
  return `lifetime|${year}|${month}|${day}|${hour ?? -1}|${gender}`;
}
