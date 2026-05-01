// 클라이언트/서버 공용 타입 — .server/ 밖에서 import 가능

export interface SavedSajuProfile {
  _id: string;
  userId: string;
  label: string; // 별칭 (예: "나", "엄마")
  name: string;
  gender: '남' | '여';
  year: number;
  month: number;
  day: number;
  hour: number | null;
  createdAt: string;
}

export interface ProfileListResponse {
  profiles: SavedSajuProfile[];
}

export interface ProfileCreateRequest {
  label: string;
  name: string;
  gender: '남' | '여';
  year: number;
  month: number;
  day: number;
  hour: number | null;
}

export interface ProfileCreateResponse {
  profile: SavedSajuProfile;
}

export interface ProfileDeleteResponse {
  success: boolean;
}
