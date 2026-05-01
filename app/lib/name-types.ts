// 클라이언트/서버 공용 타입 — .server/ 밖에서 import 가능

export interface NameRequest {
  surname: string; // 성
  givenName: string; // 이름
  gender: '남' | '여';
}

export interface CharAnalysis {
  char: string;
  strokes: number;
  ohaeng: '목' | '화' | '토' | '금' | '수';
  yinYang: '양' | '음' | '중';
}

export interface NameCalcResult {
  fullName: string;
  surnameChars: CharAnalysis[];
  givenNameChars: CharAnalysis[];
  // 원형이정 격수
  wonGyeok: number; // 원격: 이름 획수 합
  hyeongGyeok: number; // 형격: 이름 끝글자 + 첫글자 (순환)
  iGyeok: number; // 이격: 성 마지막글자 + 이름 첫글자
  jeongGyeok: number; // 정격: 전체 총획
  // 오행·음양 흐름
  ohaengFlow: ('목' | '화' | '토' | '금' | '수')[];
  yinYangFlow: ('양' | '음' | '중')[];
}

export interface NameAiInterpretation {
  overall: string;
  personality: string;
  fortune: string;
  career: string;
  love: string;
  advice: string;
}

export interface NameCalcResponse {
  calc: NameCalcResult;
  input: NameRequest;
  /** 기존 AI 캐시 (분석하기 클릭 시 자동 복원용) */
  aiCache?: { ai: NameAiInterpretation; model: string } | { pending: true };
}

export interface NameAiResponse {
  ai: NameAiInterpretation;
  model: string;
  remainingTokens: number;
}
