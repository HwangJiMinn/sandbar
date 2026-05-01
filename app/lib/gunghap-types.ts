// 클라이언트/서버 공용 타입 — .server/ 밖에서 import 가능

import type { SajuData } from './saju-calc';

export interface PersonInfo {
  name: string;
  gender: '남' | '여';
  year: number;
  month: number;
  day: number;
  hour: number | null;
}

export interface GunghapRequest {
  me: PersonInfo;
  partner: PersonInfo;
}

// ─── 점수 구성 ─────────────────────────────────────────────

export interface GunghapScores {
  ilgan: number; // 일간(천간) 관계 0-25
  ilje: number; // 일지(지지) 관계 0-25
  ohaeng: number; // 오행 조화도 0-25
  ddi: number; // 띠 궁합 0-25
  total: number; // 합계 0-100
}

export interface GunghapRelation {
  ilganRel: string; // 천간합·상생·상극·충 등
  iljeRel: string; // 지지합·삼합·원진·충 등
  ohaengDesc: string; // 두 사람 오행 관계 설명
  ddiDesc: string; // 띠 관계 설명
}

// ─── 응답 ──────────────────────────────────────────────────

export interface GunghapCalcResponse {
  me: { saju: SajuData; input: PersonInfo };
  partner: { saju: SajuData; input: PersonInfo };
  /** 기존 AI 캐시 (분석하기 클릭 시 자동 복원용) */
  aiCache?: { ai: GunghapAiInterpretation; model: string } | { pending: true };
  scores: GunghapScores;
  relation: GunghapRelation;
  level: string; // 천생연분 / 좋은 궁합 / etc.
  levelEmoji: string;
}

export interface GunghapAiInterpretation {
  overall: string;
  firstImpression: string;
  communication: string;
  romance: string;
  marriage: string;
  challenges: string;
  advice: string;
}

export interface GunghapAiResponse {
  ai: GunghapAiInterpretation;
  model: string;
  remainingTokens: number;
}
