import type { ActionFunctionArgs } from 'react-router';
import { data } from 'react-router';

import { hasAdCredit } from '~/.server/controllers/ad.controller';
import { addTokens, deductTokens } from '~/.server/controllers/token.controller';
import { getModelForContent } from '~/.server/lib/ai-models';
import {
  ForbiddenException,
  InvalidException,
  MethodNotAllowedException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { chatCompletion } from '~/.server/lib/openai';
import { handleServerError } from '~/.server/lib/utils';
import {
  GunghapAiCache,
  makeGunghapCacheKey,
} from '~/.server/models/gunghap-ai-cache.model';
import { getSessionUser } from '~/.server/services/session.service';
import { calcGunghap } from '~/lib/gunghap-calc';
import type {
  GunghapAiInterpretation,
  GunghapAiResponse,
  GunghapCalcResponse,
  GunghapRequest,
} from '~/lib/gunghap-types';
import { TOKEN_COST_GUNGHAP_AI } from '~/lib/token-constants';

export type { GunghapAiResponse, GunghapCalcResponse, GunghapRequest };

// ─── AI 해석 프롬프트 ──────────────────────────────────────

function buildPrompt(result: GunghapCalcResponse): { system: string; user: string } {
  const { me, partner, scores, relation } = result;
  const ms = me.saju;
  const ps = partner.saju;

  const system = `당신은 30년 경력의 사주명리학 전문가입니다.
두 사람의 사주 궁합을 깊이 있고 구체적으로 분석합니다.
계산 결과를 임의로 바꾸지 말고, 제공된 사주·점수·관계 정보를 기준으로 해석하세요.
너무 단정적으로 말하지 말고, 따뜻하지만 현실적인 조언을 포함하세요.
반드시 JSON 형식으로만 답변하세요.`;

  const user = `다음 두 사람의 궁합을 분석해주세요.

[나]
이름: ${me.input.name || '본인'} (${me.input.gender})
생년월일: ${me.input.year}년 ${me.input.month}월 ${me.input.day}일
사주: 년(${ms.yearPillar.cgHanja}${ms.yearPillar.jjHanja}) 월(${ms.monthPillar.cgHanja}${ms.monthPillar.jjHanja}) 일(${ms.dayPillar.cgHanja}${ms.dayPillar.jjHanja}) ${ms.hourPillar ? `시(${ms.hourPillar.cgHanja}${ms.hourPillar.jjHanja})` : '시(미상)'}
일간: ${ms.ilgan} / 띠: ${ms.animal}띠

[상대방]
이름: ${partner.input.name || '상대방'} (${partner.input.gender})
생년월일: ${partner.input.year}년 ${partner.input.month}월 ${partner.input.day}일
사주: 년(${ps.yearPillar.cgHanja}${ps.yearPillar.jjHanja}) 월(${ps.monthPillar.cgHanja}${ps.monthPillar.jjHanja}) 일(${ps.dayPillar.cgHanja}${ps.dayPillar.jjHanja}) ${ps.hourPillar ? `시(${ps.hourPillar.cgHanja}${ps.hourPillar.jjHanja})` : '시(미상)'}
일간: ${ps.ilgan} / 띠: ${ps.animal}띠

[궁합 분석 결과]
총점: ${scores.total}점 / 100점 (${result.level})
일간 관계: ${relation.ilganRel} (${scores.ilgan}점)
일지 관계: ${relation.iljeRel} (${scores.ilje}점)
오행 조화: ${relation.ohaengDesc} (${scores.ohaeng}점)
띠 궁합:   ${relation.ddiDesc} (${scores.ddi}점)

다음 JSON 형식으로 각 항목을 4~6문장으로 구체적이고 따뜻하게 작성해주세요:
{
  "overall":         "두 사람의 전체 궁합 총평",
  "firstImpression": "첫 만남의 인상과 인연의 시작",
  "communication":   "두 사람의 대화·소통 스타일 궁합",
  "romance":         "연애·감정 표현의 궁합",
  "marriage":        "결혼·동반자 관계의 궁합",
  "challenges":      "이 관계에서 주의해야 할 점",
  "advice":          "두 사람에게 전하는 조언"
}`;

  return { system, user };
}

// ─── Action 1: 궁합 계산 (광고 크레딧 필요) ───────────────

export const gunghapCalcAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const creditActive = await hasAdCredit(user.id);
    if (!creditActive) {
      throw new ForbiddenException('광고 시청 후 이용할 수 있습니다.');
    }

    const body = (await request.json()) as GunghapRequest;
    const { me, partner } = body;

    if (!me?.year || !me?.month || !me?.day)
      throw new InvalidException('나의 생년월일을 입력해주세요.');
    if (!partner?.year || !partner?.month || !partner?.day)
      throw new InvalidException('상대방의 생년월일을 입력해주세요.');
    if (!me?.gender) throw new InvalidException('나의 성별을 선택해주세요.');
    if (!partner?.gender) throw new InvalidException('상대방의 성별을 선택해주세요.');

    const result = calcGunghap(
      { ...me, hour: me.hour === -1 ? null : (me.hour ?? null) },
      { ...partner, hour: partner.hour === -1 ? null : (partner.hour ?? null) },
    );

    // ── 기존 AI 캐시 조회 ──────────────────────────────────
    let aiCache: GunghapCalcResponse['aiCache'];
    const cacheKey = makeGunghapCacheKey(
      {
        year: me.year,
        month: me.month,
        day: me.day,
        hour: me.hour === -1 ? null : (me.hour ?? null),
        gender: me.gender,
      },
      {
        year: partner.year,
        month: partner.month,
        day: partner.day,
        hour: partner.hour === -1 ? null : (partner.hour ?? null),
        gender: partner.gender,
      },
    );
    const existing = await GunghapAiCache.findOne({ userId: user.id, cacheKey });
    if (existing) {
      aiCache = existing.interpretation
        ? {
            ai: existing.interpretation as GunghapAiInterpretation,
            model: existing.model,
          }
        : { pending: true };
    }

    return data<GunghapCalcResponse>({ ...result, ...(aiCache ? { aiCache } : {}) });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action 2: AI 궁합 해석 (캐시 우선, 없으면 토큰 차감) ──

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

export const gunghapInterpretAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const body = (await request.json()) as GunghapCalcResponse;
    const meInput = body.me.input;
    const partnerInput = body.partner.input;

    const cacheKey = makeGunghapCacheKey(
      {
        year: meInput.year,
        month: meInput.month,
        day: meInput.day,
        hour: meInput.hour ?? null,
        gender: meInput.gender,
      },
      {
        year: partnerInput.year,
        month: partnerInput.month,
        day: partnerInput.day,
        hour: partnerInput.hour ?? null,
        gender: partnerInput.gender,
      },
    );

    // ── 1. 완료된 캐시 확인 ────────────────────────────────
    const existing = await GunghapAiCache.findOne({ userId: user.id, cacheKey });

    if (existing) {
      // 완료된 캐시
      if (existing.interpretation) {
        return data<GunghapAiResponse & { cached: true }>({
          ai: existing.interpretation as GunghapAiInterpretation,
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
      TOKEN_COST_GUNGHAP_AI,
      `AI 궁합 해석 (${meInput.name || '본인'} & ${partnerInput.name || '상대방'})`,
    );
    if (!tokenResult.success) {
      throw new InvalidException(tokenResult.error ?? '토큰이 부족합니다.');
    }

    // ── 3. Pending 캐시 선저장 (interpretation: null) ──────
    const pendingDoc = await GunghapAiCache.create({
      userId: user.id,
      cacheKey,
      meInput,
      partnerInput,
      interpretation: null,
      model: getModelForContent('gung-hap'),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    });

    // ── 4. AI 호출 ─────────────────────────────────────────
    const model = pendingDoc.model;
    const { system, user: userPrompt } = buildPrompt(body);

    let ai: GunghapAiInterpretation;
    try {
      ai = await chatCompletion<GunghapAiInterpretation>({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 3000,
        jsonMode: true,
        retries: 2,
      });
    } catch (aiError) {
      // AI 실패 → pending 캐시 삭제 + 토큰 환불
      await Promise.all([
        GunghapAiCache.deleteOne({ _id: pendingDoc._id }),
        addTokens(user.id, TOKEN_COST_GUNGHAP_AI, 'AI 궁합 해석 실패 — 토큰 환불'),
      ]);
      throw aiError;
    }

    // ── 5. 성공 → interpretation 업데이트 ──────────────────
    await GunghapAiCache.findByIdAndUpdate(pendingDoc._id, { interpretation: ai });

    return data<GunghapAiResponse>({
      ai,
      model,
      remainingTokens: tokenResult.balanceAfter,
    });
  } catch (error) {
    return handleServerError(error);
  }
};
