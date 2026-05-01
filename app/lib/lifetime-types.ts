// 클라이언트/서버 공용 타입

export interface LifetimeRequest {
  name: string;
  gender: '남' | '여';
  year: number;
  month: number;
  day: number;
  hour: number | null;
}

export interface DaeunPeriod {
  index: number;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  cg: string;
  jj: string;
  cgHanja: string;
  jjHanja: string;
  cgOhaeng: string;
  jjOhaeng: string;
  isCurrent: boolean;
}

export interface LifetimeCalcResponse {
  saju: import('~/lib/saju-calc').SajuData;
  daeunList: DaeunPeriod[];
  daeunStartAge: number;
  direction: '순행' | '역행';
  input: LifetimeRequest;
  aiCache?: { ai: LifetimeAiInterpretation; model: string } | { pending: true };
}

export interface LifetimeAiInterpretation {
  overview: string;
  youth: string;
  middle: string;
  senior: string;
  daeunSummaries: { period: string; summary: string }[];
  advice: string;
}

export interface LifetimeAiResponse {
  ai: LifetimeAiInterpretation;
  model: string;
  remainingTokens: number;
}
