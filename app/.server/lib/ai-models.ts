import { env } from './utils';

export type AiTier = 'free' | 'premium';

export const AI_MODELS = {
  free: env('AI_MODEL_FREE', 'gpt-5-mini'),
  premium: env('AI_MODEL_PREMIUM', 'gpt-5.5'),
} as const;

// 콘텐츠 → 티어 매핑
export const CONTENT_TIER: Record<string, AiTier> = {
  // ── 무료 ──────────────────────────
  daily: 'free',
  weekly: 'free',
  monthly: 'free',
  'zodiac-animal': 'free',
  horoscope: 'free',
  'daily-card': 'free',
  random: 'free',

  // ── 유료 ──────────────────────────
  'ai-chat': 'free',
  'ai-chat-summarize': 'free',
  saju: 'premium',
  'gung-hap': 'premium',
  reunion: 'premium',
  'mind-read': 'premium',
  'contact-chance': 'premium',
  'past-life': 'premium',
  coin: 'free',
  invest: 'premium',
  career: 'premium',
  business: 'premium',
  wealth: 'premium',
  'destiny-char': 'premium',
  'new-year': 'premium',
  lifetime: 'premium',
  tarot: 'premium',
  some: 'premium',
  cheating: 'premium',
  name: 'premium',
};

export function getModelForContent(contentKey: string): string {
  const tier = CONTENT_TIER[contentKey] ?? 'free';
  return AI_MODELS[tier];
}
