import type { FromSchema } from 'json-schema-to-ts';

// ─── 회원가입 ──────────────────────────────────────────────

export const registerSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 2,
      maxLength: 20,
    },
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 100,
    },
  },
  required: ['name', 'email', 'password'],
  additionalProperties: false,
} as const;

export type RegisterBody = FromSchema<typeof registerSchema>;

// ─── 로그인 ────────────────────────────────────────────────

export const loginSchema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 1,
    },
  },
  required: ['email', 'password'],
  additionalProperties: false,
} as const;

export type LoginBody = FromSchema<typeof loginSchema>;
