// 클라이언트/서버 공용 타입 — .server/ 밖에서 import 가능

export interface AdCreditStatus {
  expiresAt: string | null; // ISO 문자열, null이면 크레딧 없음
  canWatch: boolean; // 광고 시청 가능 여부
  totalAdsWatched: number; // 누적 시청 횟수
}

export interface AdWatchResponse {
  expiresAt: string; // 새로 갱신된 만료 시각 (ISO)
}

export interface AdCreditError {
  error: string;
}
