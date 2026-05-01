// 클라이언트/서버 공용 타입 — .server/ 밖에서 import 가능

import type { SajuData } from './saju-calc';
import type { SajuRequest } from './saju-types';

export type { SajuRequest };

export interface NewYearCalcResponse {
  saju: SajuData;
  input: SajuRequest;
  targetYear: number;
  /** 기존 AI 캐시 (분석하기 클릭 시 자동 복원용) */
  aiCache?: { ai: NewYearAiInterpretation; model: string } | { pending: true };
}

export interface NewYearAiInterpretation {
  overview: string; // 올해 총운
  wealth: string; // 재물운
  love: string; // 연애·관계운
  career: string; // 직업·사업운
  health: string; // 건강운
  monthly: string[]; // 12개월 운세 (index 0 = 1월)
  advice: string; // 올해의 조언
}

export interface NewYearAiResponse {
  ai: NewYearAiInterpretation;
  model: string;
  remainingTokens: number;
}
