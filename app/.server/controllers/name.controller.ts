import type { ActionFunctionArgs } from 'react-router';
import { data } from 'react-router';

import { addTokens, deductTokens } from '~/.server/controllers/token.controller';
import { getModelForContent } from '~/.server/lib/ai-models';
import {
  InvalidException,
  MethodNotAllowedException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { chatCompletion } from '~/.server/lib/openai';
import { handleServerError } from '~/.server/lib/utils';
import { makeNameCacheKey, NameAiCache } from '~/.server/models/name-ai-cache.model';
import { getSessionUser } from '~/.server/services/session.service';
import { calcName } from '~/lib/name-calc';
import type {
  NameAiInterpretation,
  NameAiResponse,
  NameCalcResponse,
  NameRequest,
} from '~/lib/name-types';
import { TOKEN_COST_NAME_AI } from '~/lib/token-constants';

export type { NameAiResponse, NameCalcResponse, NameRequest };

// ─── AI 해석 프롬프트 ──────────────────────────────────────

function buildPrompt(result: NameCalcResponse): { system: string; user: string } {
  const { calc, input } = result;
  const allChars = [...calc.surnameChars, ...calc.givenNameChars];

  const charDetail = allChars
    .map((c) => `${c.char}: 획수 ${c.strokes}, 오행 ${c.ohaeng}, 음양 ${c.yinYang}`)
    .join(' / ');

  const system = `당신은 30년 경력의 한국 성명학(이름풀이) 전문가입니다.
이름의 획수, 오행, 음양을 바탕으로 깊이 있고 따뜻한 이름 해석을 제공합니다.
너무 단정적으로 말하지 말고, 긍정적이면서도 현실적인 조언을 포함하세요.
반드시 JSON 형식으로만 답변하세요.`;

  const user = `다음 이름을 성명학적으로 분석해주세요.

이름: ${calc.fullName} (${input.gender})
글자별 분석: ${charDetail}
원격(이름 획수 합): ${calc.wonGyeok}획
형격(이름 순환 획수): ${calc.hyeongGyeok}획
이격(성+이름 첫글자): ${calc.iGyeok}획
정격(총획수): ${calc.jeongGyeok}획
오행 흐름: ${calc.ohaengFlow.join(' → ')}
음양 배열: ${calc.yinYangFlow.join(' · ')}

다음 JSON 형식으로 각 항목을 3~4문장으로 구체적이고 따뜻하게 작성해주세요:
{
  "overall":     "이름 전체 총평 및 첫인상",
  "personality": "이 이름을 가진 사람의 성격과 기질",
  "fortune":     "전반적인 운세 흐름과 타고난 운",
  "career":      "직업운과 사회적 성취 방향",
  "love":        "연애·대인관계 운세",
  "advice":      "이 이름을 가진 분께 드리는 조언"
}`;

  return { system, user };
}

// ─── Action 1: 이름 계산 ──────────────────────────────────

export const nameCalcAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const body = (await request.json()) as NameRequest;
    const { surname, givenName, gender } = body;

    if (!surname?.trim()) throw new InvalidException('성을 입력해주세요.');
    if (!givenName?.trim()) throw new InvalidException('이름을 입력해주세요.');
    if (!gender) throw new InvalidException('성별을 선택해주세요.');

    const result = calcName({
      surname: surname.trim(),
      givenName: givenName.trim(),
      gender,
    });

    // ── 기존 AI 캐시 조회 (로그인 시) ─────────────────────
    let aiCache: NameCalcResponse['aiCache'];
    const user = await getSessionUser(request);
    if (user) {
      const cacheKey = makeNameCacheKey(surname.trim(), givenName.trim(), gender);
      const existing = await NameAiCache.findOne({ userId: user.id, cacheKey });
      if (existing) {
        aiCache = existing.interpretation
          ? { ai: existing.interpretation as NameAiInterpretation, model: existing.model }
          : { pending: true };
      }
    }

    return data<NameCalcResponse>({ ...result, ...(aiCache ? { aiCache } : {}) });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action 2: AI 이름 해석 ───────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

export const nameInterpretAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const body = (await request.json()) as NameCalcResponse;
    const { input } = body;

    const cacheKey = makeNameCacheKey(input.surname, input.givenName, input.gender);

    // ── 1. 캐시 확인 ──────────────────────────────────────
    const existing = await NameAiCache.findOne({ userId: user.id, cacheKey });

    if (existing) {
      if (existing.interpretation) {
        return data<NameAiResponse & { cached: true }>({
          ai: existing.interpretation as NameAiInterpretation,
          model: existing.model,
          remainingTokens: -1,
          cached: true,
        });
      }
      return data({ pending: true });
    }

    // ── 2. 토큰 차감 ──────────────────────────────────────
    const tokenResult = await deductTokens(
      user.id,
      TOKEN_COST_NAME_AI,
      `AI 이름풀이 (${input.surname}${input.givenName})`,
    );
    if (!tokenResult.success) {
      throw new InvalidException(tokenResult.error ?? '토큰이 부족합니다.');
    }

    // ── 3. Pending 캐시 선저장 ────────────────────────────
    const pendingDoc = await NameAiCache.create({
      userId: user.id,
      cacheKey,
      input,
      interpretation: null,
      model: getModelForContent('name'),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    });

    // ── 4. AI 호출 ────────────────────────────────────────
    const model = pendingDoc.model;
    const { system, user: userPrompt } = buildPrompt(body);

    let ai: NameAiInterpretation;
    try {
      ai = await chatCompletion<NameAiInterpretation>({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 2000,
        jsonMode: true,
        retries: 2,
      });
    } catch (aiError) {
      await Promise.all([
        NameAiCache.deleteOne({ _id: pendingDoc._id }),
        addTokens(user.id, TOKEN_COST_NAME_AI, 'AI 이름풀이 실패 — 토큰 환불'),
      ]);
      throw aiError;
    }

    // ── 5. 성공 → interpretation 업데이트 ─────────────────
    await NameAiCache.findByIdAndUpdate(pendingDoc._id, { interpretation: ai });

    return data<NameAiResponse>({
      ai,
      model,
      remainingTokens: tokenResult.balanceAfter,
    });
  } catch (error) {
    return handleServerError(error);
  }
};
