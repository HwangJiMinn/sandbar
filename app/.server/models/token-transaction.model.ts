import type { Document, Model, Types } from 'mongoose';
import { Schema } from 'mongoose';
import autopopulate from 'mongoose-autopopulate';

import { db } from '~/.server/lib/mongodb';

import type { IUser } from './user.model';

// ─── 타입 ─────────────────────────────────────────────────

export type TransactionType = 'purchase' | 'usage';

export interface ITokenTransaction extends Document {
  userId: Types.ObjectId | IUser; // autopopulate 시 IUser
  amount: number; // 양수: 충전, 음수: 사용
  type: TransactionType;
  description: string;
  balanceAfter: number; // 거래 후 잔액 (스냅샷)
  createdAt: Date;
}

// ─── 스키마 ────────────────────────────────────────────────

const tokenTransactionSchema = new Schema<ITokenTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // mongoose-autopopulate: populate() 없이 자동 join
      autopopulate: { select: 'name email tokenBalance' },
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'usage'] satisfies TransactionType[],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

tokenTransactionSchema.plugin(autopopulate);

// ─── 모델 ──────────────────────────────────────────────────

export const TokenTransaction: Model<ITokenTransaction> =
  db.models.TokenTransaction ??
  db.model<ITokenTransaction>('TokenTransaction', tokenTransactionSchema);
