/* eslint-disable no-redeclare */
import { resolveAcceptLanguage } from 'resolve-accept-language';

import { DEFAULT_LANGUAGE, LANGUAGES } from '~/common/constants';

import type {
  CommonJson,
  Namespace,
  NamespaceMap,
  NonCommonNamespace,
} from '../locales/locales.types';
import { getLanguageSession } from '../services/session.service';

// * Accept-Language 헤더에서 가장 적합한 언어를 결정 (언어 코드만 반환: 'en', 'ko')
export const getAcceptLanguage = (request: Request) => {
  const header = request.headers.get('accept-language');
  const defaultBase = DEFAULT_LANGUAGE.split('-')[0];
  if (!header) return defaultBase;
  const resolved = resolveAcceptLanguage(header, LANGUAGES, DEFAULT_LANGUAGE);
  const lang = typeof resolved === 'string' ? resolved : DEFAULT_LANGUAGE;
  return lang.split('-')[0];
};

// Vite가 정적으로 인식 가능한 로케일 로더 테이블
const localeModules = import.meta.glob('../locales/*/*.json');

// 캐시
const rawCache = new Map<string, any>();
const mergedCache = new Map<string, any>();

// 언어 코드 정규화 (예: 'en-US' -> 'en')
function normalizeBaseLang(lang: string) {
  return lang.split('-')[0];
}

// 로케일 JSON 로드 (캐시 사용)
async function loadLocaleRaw(language: string, namespace: string) {
  const baseLang = normalizeBaseLang(language);
  const key = `${baseLang}:${namespace}`;
  if (rawCache.has(key)) return rawCache.get(key);
  const moduleKey = `../locales/${baseLang}/${namespace}.json`;
  const loader = localeModules[moduleKey];
  if (!loader) return null;
  const mod = (await loader()) as { default: unknown };
  rawCache.set(key, mod.default);
  return mod.default;
}

// 폴백 로드: 1) 요청 언어 -> 2) DEFAULT_LANGUAGE
async function loadWithFallback(language: string, namespace: string) {
  const first = await loadLocaleRaw(language, namespace);
  if (first) return first;
  const fallback = await loadLocaleRaw(DEFAULT_LANGUAGE, namespace);
  return fallback ?? null;
}

// 키 충돌 경고
function warnKeyConflicts(
  common: Record<string, any>,
  page: Record<string, any>,
  namespace: string,
) {
  if (process.env.NODE_ENV === 'production') return;
  const conflicts: string[] = [];
  for (const k of Object.keys(page)) {
    if (k in common) conflicts.push(k);
  }
  if (conflicts.length > 0) {
    console.warn(
      `[localization] Key conflict while merging namespace "${namespace}". Page keys overwrite common keys: ${conflicts.join(
        ', ',
      )}`,
    );
  }
}

// * 로케일 JSON 로드 및 병합
export async function localize(
  request: Request,
  namespace?: 'common',
): Promise<CommonJson>;
export async function localize<N extends NonCommonNamespace>(
  request: Request,
  namespace: N,
): Promise<CommonJson & NamespaceMap[N]>;
export async function localize(request: Request, namespace: Namespace = 'common') {
  const languageSession = await getLanguageSession(request);
  const language = languageSession.getLanguage();

  // merged 캐시 키: lang:namespace:merged
  const mergedKey = `${normalizeBaseLang(language)}:${namespace}:merged`;
  if (namespace !== 'common' && mergedCache.has(mergedKey)) {
    return mergedCache.get(mergedKey);
  }

  const common = (await loadWithFallback(language, 'common')) as CommonJson | null;
  if (!common) {
    throw new Error('[localization] Missing common locale JSON file.');
  }

  if (namespace === 'common') {
    return common;
  }

  const page = (await loadWithFallback(language, namespace)) as
    | NamespaceMap[typeof namespace]
    | null;

  // namespace 파일이 없으면 common만 반환
  if (!page) {
    mergedCache.set(mergedKey, common);
    return common;
  }

  if (process.env.NODE_ENV !== 'production') {
    warnKeyConflicts(common as any, page as any, namespace);
  }

  const merged = { ...(common as any), ...(page as any) } as CommonJson &
    NamespaceMap[typeof namespace];
  mergedCache.set(mergedKey, merged);
  return merged;
}

// 에러 메시지 번역
export const localizedError = async (request: Request) => {
  return await localize(request, 'error');
};
