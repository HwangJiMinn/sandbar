// 클라이언트/서버 공용 타입 — .server/ 밖에서 import 가능

export interface SajuRequest {
  name: string;
  gender: '남' | '여';
  year: number;
  month: number;
  day: number;
  hour: number | null;
}

export interface AiInterpretation {
  overview: string;
  personality: string;
  career: string;
  love: string;
  wealth: string;
  health: string;
  advice: string;
  luckyColor: string;
  luckyNumber: number;
  luckyDirection: string;
}

export interface SajuCalcResponse {
  saju: import('~/lib/saju-calc').SajuData;
  input: SajuRequest;
  /** 기존 AI 캐시 (분석하기 클릭 시 자동 복원용) */
  aiCache?: { ai: AiInterpretation; model: string } | { pending: true };
}

export interface SajuAiResponse {
  ai: AiInterpretation;
  model: string;
  remainingTokens: number;
}
