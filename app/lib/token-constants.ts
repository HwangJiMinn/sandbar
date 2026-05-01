// 클라이언트/서버 공용 상수 — .server/ 밖에서 import 가능

// ─── 토큰 비용 ─────────────────────────────────────────────
// 🔴 프리미엄 AI (gpt-5.5) — 회당 500토큰
export const TOKEN_COST_SAJU_AI = 500;
export const TOKEN_COST_GUNGHAP_AI = 500;
export const TOKEN_COST_NEW_YEAR_AI = 500; // 신년 운세
export const TOKEN_COST_LIFETIME_AI = 500; // 평생 운세
// 사용 예정 (🔴 500토큰)
export const TOKEN_COST_SOME_AI = 500; // 썸 궁합
export const TOKEN_COST_REUNION_AI = 500; // 이별 후 재회
export const TOKEN_COST_CONTACT_AI = 500; // 연락 올 확률
export const TOKEN_COST_MINDREAD_AI = 500; // 속마음 분석
export const TOKEN_COST_CHEATING_AI = 500; // 바람 여부

// 🤖 AI 대화형 사주 — 세션 1회 시작 비용 (30분 / 50질문)
export const TOKEN_COST_AI_CHAT_SESSION = 3000;
// 세션 제한
export const AI_CHAT_SESSION_MS = 30 * 60 * 1000; // 30분
export const AI_CHAT_MAX_QUESTIONS = 50;
export const AI_CHAT_SUMMARY_EVERY = 5; // 5질문마다 요약

// 🟢 경량 AI (gpt-5-mini) — 이름풀이
export const TOKEN_COST_NAME_AI = 100;

// 🟡 경량 AI (gpt-5-mini) — 회당 100토큰
export const TOKEN_COST_DAILY_AI = 100; // 일일 운세
export const TOKEN_COST_WEEKLY_AI = 100; // 주간 운세
export const TOKEN_COST_MONTHLY_AI = 100; // 월간 운세
export const TOKEN_COST_WEALTH_AI = 100; // 재물운
export const TOKEN_COST_INVEST_AI = 100; // 투자 운세
export const TOKEN_COST_COIN_AI = 100; // 코인 운세
export const TOKEN_COST_CAREER_AI = 100; // 취업·이직운
export const TOKEN_COST_BUSINESS_AI = 100; // 사업운
export const TOKEN_COST_TAROT_AI = 100; // 타로

// ─── 광고 크레딧 ────────────────────────────────────────────
// 광고 1회 시청 시 지급되는 무료 이용 시간 (ms)
export const AD_CREDIT_MS = 60 * 60 * 1000; // 1시간

// 광고 재시청 허용 기준: 남은 시간이 이 값 이하일 때만 가능
export const AD_REWATCH_THRESHOLD_MS = 10 * 60 * 1000; // 10분

// 광고 영상 최소 시청 시간 (ms) — skip 버튼 등장 전
export const AD_SKIP_DELAY_MS = 5_000; // 5초 후 skip 가능
export const AD_TOTAL_DURATION_MS = 15_000; // 15초 전체 광고 길이
