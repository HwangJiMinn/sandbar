import type { ErrorObject } from 'ajv';

export class HttpException extends Error {
  status: number;
  message: string;
  path?: string;
  constructor(status: number, message: string, path?: string) {
    super(message);
    this.status = status;
    this.message = message;
    this.path = path;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// * 400: 유효하지 않은 데이터 예외 처리
export class InvalidException extends HttpException {
  constructor(message: string, path?: string) {
    super(400, message, path);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// * 400: Ajv 유효성 검사 실패 예외 처리
export class AjvInvalidException extends HttpException {
  constructor(errors: ErrorObject[]) {
    const path = errors[0].instancePath.replace(/^\//, '');
    super(400, errors[0].message, path);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// * 401: 인증 실패 예외 처리
export class UnauthorizedException extends HttpException {
  constructor(message?: string) {
    super(401, message ?? 'Unauthorized');
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// * 403: 권한 없음 예외 처리
export class ForbiddenException extends HttpException {
  constructor(message?: string) {
    super(403, message ?? 'Forbidden');
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// * 404: 존재하지 않는 데이터 예외 처리
export class NotFoundException extends HttpException {
  constructor(message: string, path?: string) {
    super(404, message, path);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// * 405: 허용되지 않은 요청 예외 처리
export class MethodNotAllowedException extends HttpException {
  constructor(message?: string) {
    super(405, message ?? 'Method Not Allowed');
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// * 409: 이미 존재하는 데이터 예외 처리
export class AlreadyExistsException extends HttpException {
  constructor(message: string, path?: string) {
    super(409, message, path);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
