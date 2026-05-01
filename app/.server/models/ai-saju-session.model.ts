import type { Document, Model, Types } from 'mongoose';
import { Schema } from 'mongoose';

import { db } from '~/.server/lib/mongodb';

// ─── 인터페이스 ────────────────────────────────────────────

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IBirthInfo {
  name: string;
  gender: string;
  year: number;
  month: number;
  day: number;
  hour: number | null;
}

export interface IAiSajuSession extends Document {
  userId: Types.ObjectId;
  birthInfo: IBirthInfo;
  expiresAt: Date; // 세션 만료 (30분)
  questionCount: number; // 누적 질문 수 (max 50)
  summary: string; // 5질문마다 AI가 압축한 요약
  recentMessages: IChatMessage[]; // 마지막 요약 이후 대화 (최대 10개)
  createdAt: Date;
  updatedAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: false },
);

const birthInfoSchema = new Schema<IBirthInfo>(
  {
    name: String,
    gender: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    day: { type: Number, required: true },
    hour: { type: Number, default: null },
  },
  { _id: false },
);

const aiSajuSessionSchema = new Schema<IAiSajuSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    birthInfo: { type: birthInfoSchema, required: true },
    expiresAt: { type: Date, required: true, index: true },
    questionCount: { type: Number, default: 0, min: 0, max: 50 },
    summary: { type: String, default: '' },
    recentMessages: { type: [chatMessageSchema], default: [] },
  },
  { timestamps: true },
);

// 만료 자동 삭제 (TTL 인덱스 — expiresAt 이후 즉시 삭제)
aiSajuSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── 모델 ──────────────────────────────────────────────────

export const AiSajuSession: Model<IAiSajuSession> =
  db.models.AiSajuSession ??
  db.model<IAiSajuSession>('AiSajuSession', aiSajuSessionSchema);
