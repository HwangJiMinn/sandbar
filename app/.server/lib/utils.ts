import type { ExtendedJSONSchema } from 'json-schema-to-ts';
import { data, type Params } from 'react-router';

import type { HandledError } from '~/common/types/common.types';
import type { DataWithResponseInit, ToJson } from '~/common/types/serialize.types';
import ajv from '~/lib/ajv';

import { AjvInvalidException, HttpException } from './exceptions';

// * 환경변수 가져오기
export const env = (name: string, defaultValue?: string) => {
  const env = process.env[name];
  if (!env && !defaultValue) {
    throw new Error(`Please define the ${name} environment variable.`);
  }
  return env ? env : defaultValue;
};

// * FormData 객체 추출
export const parseFormData = async <T = any>(request: Request) => {
  const formData = await request.formData();
  return Object.fromEntries(formData) as T;
};

// * JSON 객체 추출
export const parseJsonData = async <T = any>(request: Request) => {
  const jsonData = await request.json();
  return jsonData as ToJson<T>;
};

// * URL에서 searchParams(쿼리스트링)를 Object 형태로 파싱
export const parseSearchParams = <T = any>(url: string) => {
  const params = new URL(url).searchParams;
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key).map((v) => decodeURIComponent(v));
    result[key] = all.length > 1 ? all : all[0];
  }
  return result as T;
};

// * Ajv 유효성 검사
export const validate = (schema: ExtendedJSONSchema, data: any) => {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    throw new AjvInvalidException(validate.errors!);
  }
  return valid;
};

// * FormData 객체 추출 및 Ajv 유효성 검사
export const validateFormData = async <T>(
  request: Request,
  schema: ExtendedJSONSchema,
) => {
  const payload = await parseFormData<T>(request);
  validate(schema, payload);
  return payload;
};

// * JSON 객체 추출 및 Ajv 유효성 검사
export const validateJsonData = async <T>(
  request: Request,
  schema: ExtendedJSONSchema,
) => {
  const payload = await parseJsonData<T>(request);
  validate(schema, payload);
  return payload;
};

// * SearchParams(쿼리스트링) 파싱 및 Ajv 유효성 검사
export const validateSearchParams = <T>(request: Request, schema: ExtendedJSONSchema) => {
  const payload = parseSearchParams<T>(request.url);
  validate(schema, payload);
  return payload;
};

// * Params Ajv 유효성 검사
export const validateParams = (params: Params<string>, schema: ExtendedJSONSchema) => {
  validate(schema, params);
  return params;
};

// * JSON 타입 추론 응답 생성
// NOTE: Remix에서 json 함수가 deprecated됨에 따라 기존 함수 대채 및 JSON 직렬화 타입 추론
export const toJson = <T = any>(data: T, options?: Response) => {
  return new Response(JSON.stringify(data), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  }) as ToJson<T>;
};

// * 서버사이드 예외 처리 함수
// NOTE: HttpException 및 일반 Error 인스턴스를 구분하여 `ServerException` 타입의 일관된 응답 생성
export const handleServerError = (error: unknown): DataWithResponseInit<HandledError> => {
  if (error instanceof HttpException) {
    return data(
      {
        error: {
          message: error.message,
          ...(error.path ? { path: error.path } : {}),
        },
      },
      { status: error.status },
    );
  } else if (error instanceof Error) {
    console.error(error);
    return data(
      {
        error: {
          message: error.message,
        },
      },
      { status: 500 },
    );
  } else {
    console.error(error);
    return data(
      {
        error: {
          message: 'Unknown Error',
        },
      },
      { status: 500 },
    );
  }
};
