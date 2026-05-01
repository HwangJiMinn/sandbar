import type { Connection } from 'mongoose';
import mongoose from 'mongoose';

import type { ToJson } from '~/common/types/serialize.types';

import { env } from './utils';

declare module 'mongoose' {
  interface Document {
    toJSON(): ToJson<this>;
  }
}

const MONGODB_URI = env('MONGODB_URI');

const connectionOptions = {
  bufferCommands: false,
  authSource: 'admin',
};

export const db: Connection = mongoose.createConnection(
  `${MONGODB_URI}/fortune`,
  connectionOptions,
);
