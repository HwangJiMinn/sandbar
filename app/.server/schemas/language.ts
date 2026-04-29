// TODO: JSON Schema로 파라미터 타입 정의하고 Ajv로 유효성 검사
// https://github.com/ThomasAribart/json-schema-to-ts#readme
// https://ajv.js.org/

import type { FromSchema } from 'json-schema-to-ts';

import { LANGUAGES } from '~/common/constants';

export const updateLanguageSchema = {
  type: 'object',
  properties: {
    language: {
      type: 'string',
      enum: LANGUAGES.map((lang) => lang.split('-')[0]),
      description: '변경하려는 언어 코드',
    },
  },
  required: ['language'],
  additionalProperties: false,
} as const;

export type UpdateLanguage = FromSchema<typeof updateLanguageSchema>;
