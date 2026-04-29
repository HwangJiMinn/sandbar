// * 서버 예외 반환 타입
export interface ServerException {
  message?: string; // 에러 메시지
  path?: string; // 에러 발생 경로
}

// * handleServerError 함수에서 예외처리되는 일관된 에러 응답 타입
export type HandledError = { error: ServerException };
