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
import { makeSajuCacheKey, SajuAiCache } from '~/.server/models/saju-ai-cache.model';
import { getSessionUser } from '~/.server/services/session.service';
import { calcSaju, type SajuData } from '~/lib/saju-calc';
import type {
  AiInterpretation,
  SajuAiResponse,
  SajuCalcResponse,
  SajuRequest,
} from '~/lib/saju-types';
import { TOKEN_COST_SAJU_AI } from '~/lib/token-constants';

// ─── 타입 re-export ────────────────────────────────────────
export type {
  AiInterpretation,
  SajuAiResponse,
  SajuCalcResponse,
  SajuRequest,
} from '~/lib/saju-types';

// ─── AI 해석 프롬프트 ──────────────────────────────────────

function buildInterpretPrompt(input: SajuRequest, saju: SajuData) {
  const {
    yearPillar: yp,
    monthPillar: mp,
    dayPillar: dp,
    hourPillar: hp,
    ohaengCount,
  } = saju;
  const hourText = hp ? `${hp.cg}${hp.jj} (${hp.cgHanja}${hp.jjHanja})` : '시간 미상';
  const ohaengText = Object.entries(ohaengCount)
    .map(([k, v]) => `${k} ${v}개`)
    .join(', ');

  const system = `당신은 30년 경력의 사주명리학 전문가입니다.
사용자의 사주 정보를 바탕으로 깊이 있고 구체적인 운세 해석을 JSON 형식으로 제공합니다.
계산 결과를 임의로 바꾸지 말고, 제공된 사주·점수·관계 정보를 기준으로 해석하세요.
너무 단정적으로 말하지 말고, 따뜻하지만 현실적인 조언을 포함하세요.
반드시 JSON 형식으로만 답변하세요.`;

  const user = `다음 사주 정보를 해석해주세요.

[기본 정보]
이름: ${input.name || '익명'}
성별: ${input.gender}
생년월일: ${input.year}년 ${input.month}월 ${input.day}일

[사주 팔자 (四柱八字)]
년주: ${yp.cg}${yp.jj} (${yp.cgHanja}${yp.jjHanja}) — ${yp.cgOhaeng}/${yp.jjOhaeng}
월주: ${mp.cg}${mp.jj} (${mp.cgHanja}${mp.jjHanja}) — ${mp.cgOhaeng}/${mp.jjOhaeng}
일주: ${dp.cg}${dp.jj} (${dp.cgHanja}${dp.jjHanja}) — ${dp.cgOhaeng}/${dp.jjOhaeng}  ← 일간(본인)
시주: ${hourText}

[오행 분포]
${ohaengText}

[추가 정보]
띠: ${saju.animal}띠 / 일간: ${saju.ilgan}

다음 JSON 형식으로 답변하세요. 각 항목을 4~6문장으로 구체적으로 작성하세요:
{
  "overview": "전체 총운 및 타고난 운명",
  "personality": "성격과 기질 분석",
  "career": "직업운과 재능, 적합한 직종",
  "love": "연애운과 결혼운",
  "wealth": "재물운과 금전운",
  "health": "건강운과 주의할 부분",
  "advice": "총평 및 인생 조언",
  "luckyColor": "행운의 색 (예: 보라색)",
  "luckyNumber": 7,
  "luckyDirection": "행운의 방향 (예: 동쪽)"
}`;

  return { system, user };
}

// ─── Action 1: 사주 계산만 (무료) ─────────────────────────

export const sajuCalcAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const body = (await request.json()) as SajuRequest;
    const { gender, year, month, day, hour } = body;

    if (!year || !month || !day) throw new InvalidException('생년월일을 입력해주세요.');
    if (!gender) throw new InvalidException('성별을 선택해주세요.');

    const actualHour = hour === -1 ? null : hour;
    const saju = calcSaju(year, month, day, actualHour ?? null);

    // ── 기존 AI 캐시 조회 (로그인 시) ─────────────────────
    let aiCache: SajuCalcResponse['aiCache'];
    const user = await getSessionUser(request);
    if (user) {
      const cacheKey = makeSajuCacheKey(year, month, day, actualHour ?? null, gender);
      const existing = await SajuAiCache.findOne({ userId: user.id, cacheKey });
      if (existing) {
        aiCache = existing.interpretation
          ? { ai: existing.interpretation as AiInterpretation, model: existing.model }
          : { pending: true };
      }
    }

    return data<SajuCalcResponse>({
      saju,
      input: { ...body, hour: actualHour },
      ...(aiCache ? { aiCache } : {}),
    });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action 2: AI 해석 (캐시 우선, 없으면 토큰 차감) ────────

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

export const sajuInterpretAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const body = (await request.json()) as { input: SajuRequest; saju: SajuData };
    const { input, saju } = body;

    const cacheKey = makeSajuCacheKey(
      input.year,
      input.month,
      input.day,
      input.hour ?? null,
      input.gender,
    );

    // ── 1. 완료된 캐시 확인 ────────────────────────────────
    const existing = await SajuAiCache.findOne({ userId: user.id, cacheKey });

    if (existing) {
      // 완료된 캐시
      if (existing.interpretation) {
        return data<SajuAiResponse & { cached: true }>({
          ai: existing.interpretation as AiInterpretation,
          model: existing.model,
          remainingTokens: -1,
          cached: true,
        });
      }
      // 처리 중인 캐시 (이미 토큰 차감됨 — 중복 차감 방지)
      return data({ pending: true });
    }

    // ── 2. 토큰 차감 ───────────────────────────────────────
    const tokenResult = await deductTokens(
      user.id,
      TOKEN_COST_SAJU_AI,
      `AI 사주 해석 (${input.year}.${input.month}.${input.day})`,
    );
    if (!tokenResult.success) {
      throw new InvalidException(tokenResult.error ?? '토큰이 부족합니다.');
    }

    // ── 3. Pending 캐시 선저장 (interpretation: null) ──────
    const pendingDoc = await SajuAiCache.create({
      userId: user.id,
      cacheKey,
      input,
      interpretation: null,
      model: getModelForContent('saju'),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    });

    // ── 4. AI 호출 ─────────────────────────────────────────
    const model = pendingDoc.model;
    const { system, user: userPrompt } = buildInterpretPrompt(input, saju);

    let ai: AiInterpretation;
    try {
      ai = await chatCompletion<AiInterpretation>({
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
      // AI 실패 → pending 캐시 삭제 + 토큰 환불
      await Promise.all([
        SajuAiCache.deleteOne({ _id: pendingDoc._id }),
        addTokens(user.id, TOKEN_COST_SAJU_AI, 'AI 사주 해석 실패 — 토큰 환불'),
      ]);
      throw aiError;
    }

    // ── 5. 성공 → interpretation 업데이트 ──────────────────
    await SajuAiCache.findByIdAndUpdate(pendingDoc._id, { interpretation: ai });

    return data<SajuAiResponse>({ ai, model, remainingTokens: tokenResult.balanceAfter });
  } catch (error) {
    return handleServerError(error);
  }
};
