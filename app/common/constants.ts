// * locale
export const LANGUAGES = ['en-US', 'ko-KR'] as const;
export const DEFAULT_LANGUAGE = 'ko-KR'; // 기본 언어
export enum Language {
  en = 'en',
  ko = 'ko',
}

// * theme
export enum Theme {
  dark = 'dark',
  light = 'light',
}
