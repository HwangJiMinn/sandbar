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
import {
  makeNewYearCacheKey,
  NewYearAiCache,
} from '~/.server/models/new-year-ai-cache.model';
import { getSessionUser } from '~/.server/services/session.service';
import type {
  NewYearAiInterpretation,
  NewYearAiResponse,
  NewYearCalcResponse,
} from '~/lib/new-year-types';
import { calcSaju, type SajuData } from '~/lib/saju-calc';
import type { SajuRequest } from '~/lib/saju-types';
import { TOKEN_COST_NEW_YEAR_AI } from '~/lib/token-constants';

export type { NewYearAiResponse, NewYearCalcResponse };

// ─── AI 프롬프트 ────────────────────────────────────────────

function buildPrompt(
  input: SajuRequest,
  saju: SajuData,
  targetYear: number,
): { system: string; user: string } {
  const { yearPillar: yp, monthPillar: mp, dayPillar: dp, hourPillar: hp } = saju;
  const hourText = hp ? `${hp.cgHanja}${hp.jjHanja}` : '시간 미상';

  const system = `당신은 30년 경력의 사주명리학 전문가입니다.
사용자의 사주를 바탕으로 ${targetYear}년 한 해의 운세를 깊이 있고 구체적으로 분석합니다.
계산 결과를 임의로 바꾸지 말고, 제공된 사주 정보를 기준으로 해석하세요.
따뜻하지만 현실적인 조언을 포함하세요.
반드시 JSON 형식으로만 답변하세요.`;

  const user = `다음 사주를 바탕으로 ${targetYear}년 신년 운세를 분석해주세요.

[기본 정보]
이름: ${input.name || '익명'} / 성별: ${input.gender}
생년월일: ${input.year}년 ${input.month}월 ${input.day}일

[사주 팔자]
년주: ${yp.cgHanja}${yp.jjHanja} / 월주: ${mp.cgHanja}${mp.jjHanja} / 일주: ${dp.cgHanja}${dp.jjHanja} / 시주: ${hourText}
일간: ${saju.ilgan} / 띠: ${saju.animal}띠

[오행 분포]
${Object.entries(saju.ohaengCount)
  .map(([k, v]) => `${k} ${v}개`)
  .join(', ')}

다음 JSON 형식으로 답변하세요. overview·wealth·love·career·health·advice는 각 4~5문장, monthly는 1월부터 12월까지 각 2~3문장:
{
  "overview": "${targetYear}년 전체 총운 — 올해의 큰 흐름과 핵심 에너지",
  "wealth":   "재물·금전운 — 수입, 투자, 지출 흐름",
  "love":     "연애·관계운 — 인연, 감정, 대인관계",
  "career":   "직업·사업운 — 커리어, 직장, 사업 방향",
  "health":   "건강운 — 주의할 부위, 건강 관리법",
  "monthly":  ["1월 운세", "2월 운세", "3월 운세", "4월 운세", "5월 운세", "6월 운세", "7월 운세", "8월 운세", "9월 운세", "10월 운세", "11월 운세", "12월 운세"],
  "advice":   "${targetYear}년을 잘 보내기 위한 핵심 조언"
}`;

  return { system, user };
}

// ─── Action 1: 계산 ─────────────────────────────────────────

export const newYearCalcAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const body = (await request.json()) as SajuRequest;
    const { gender, year, month, day, hour } = body;

    if (!year || !month || !day) throw new InvalidException('생년월일을 입력해주세요.');
    if (!gender) throw new InvalidException('성별을 선택해주세요.');

    const actualHour = hour === -1 ? null : hour;
    const saju = calcSaju(year, month, day, actualHour ?? null);
    const targetYear = new Date().getFullYear();

    // ── 기존 AI 캐시 조회 (로그인 시) ─────────────────────
    let aiCache: NewYearCalcResponse['aiCache'];
    const user = await getSessionUser(request);
    if (user) {
      const cacheKey = makeNewYearCacheKey(
        year,
        month,
        day,
        actualHour ?? null,
        gender,
        targetYear,
      );
      const existing = await NewYearAiCache.findOne({ userId: user.id, cacheKey });
      if (existing) {
        aiCache = existing.interpretation
          ? {
              ai: existing.interpretation as NewYearAiInterpretation,
              model: existing.model,
            }
          : { pending: true };
      }
    }

    return data<NewYearCalcResponse>({
      saju,
      input: { ...body, hour: actualHour },
      targetYear,
      ...(aiCache ? { aiCache } : {}),
    });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action 2: AI 해석 ──────────────────────────────────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

export const newYearInterpretAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const body = (await request.json()) as NewYearCalcResponse;
    const { input, saju, targetYear } = body;
    const actualHour = input.hour === -1 ? null : input.hour;

    const cacheKey = makeNewYearCacheKey(
      input.year,
      input.month,
      input.day,
      actualHour ?? null,
      input.gender,
      targetYear,
    );

    // ── 1. 캐시 확인 ──────────────────────────────────────
    const existing = await NewYearAiCache.findOne({ userId: user.id, cacheKey });
    if (existing) {
      if (existing.interpretation) {
        return data<NewYearAiResponse & { cached: true }>({
          ai: existing.interpretation as NewYearAiInterpretation,
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
      TOKEN_COST_NEW_YEAR_AI,
      `AI ${targetYear}년 신년 운세 (${input.name || '익명'})`,
    );
    if (!tokenResult.success) {
      throw new InvalidException(tokenResult.error ?? '토큰이 부족합니다.');
    }

    // ── 3. Pending 캐시 선저장 ────────────────────────────
    const pendingDoc = await NewYearAiCache.create({
      userId: user.id,
      cacheKey,
      input,
      targetYear,
      interpretation: null,
      model: getModelForContent('new-year'),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    });

    // ── 4. AI 호출 ────────────────────────────────────────
    const model = pendingDoc.model;
    const { system, user: userPrompt } = buildPrompt(input, saju, targetYear);

    let ai: NewYearAiInterpretation;
    try {
      ai = await chatCompletion<NewYearAiInterpretation>({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 4000,
        jsonMode: true,
        retries: 2,
      });
    } catch (aiError) {
      await Promise.all([
        NewYearAiCache.deleteOne({ _id: pendingDoc._id }),
        addTokens(
          user.id,
          TOKEN_COST_NEW_YEAR_AI,
          `AI ${targetYear}년 신년 운세 실패 — 토큰 환불`,
        ),
      ]);
      throw aiError;
    }

    // ── 5. 성공 → 업데이트 ───────────────────────────────
    await NewYearAiCache.findByIdAndUpdate(pendingDoc._id, { interpretation: ai });

    return data<NewYearAiResponse>({
      ai,
      model,
      remainingTokens: tokenResult.balanceAfter,
    });
  } catch (error) {
    return handleServerError(error);
  }
};
