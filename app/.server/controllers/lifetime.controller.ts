import type { ActionFunctionArgs } from 'react-router';
import { data } from 'react-router';

import { deductTokens } from '~/.server/controllers/token.controller';
import { getModelForContent } from '~/.server/lib/ai-models';
import {
  InvalidException,
  MethodNotAllowedException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { chatCompletion } from '~/.server/lib/openai';
import { handleServerError } from '~/.server/lib/utils';
import {
  LifetimeAiCache,
  makeLifetimeCacheKey,
} from '~/.server/models/lifetime-ai-cache.model';
import { getSessionUser } from '~/.server/services/session.service';
import { calcDaeun } from '~/lib/daeun-calc';
import type {
  DaeunPeriod,
  LifetimeAiInterpretation,
  LifetimeAiResponse,
  LifetimeRequest,
} from '~/lib/lifetime-types';
import { calcSaju, type SajuData } from '~/lib/saju-calc';
import { TOKEN_COST_LIFETIME_AI } from '~/lib/token-constants';

export type { LifetimeAiResponse };

// ─── AI 프롬프트 ────────────────────────────────────────────

function buildPrompt(
  input: LifetimeRequest,
  saju: SajuData,
  daeunList: DaeunPeriod[],
  direction: string,
  daeunStartAge: number,
) {
  const { yearPillar: yp, monthPillar: mp, dayPillar: dp, hourPillar: hp } = saju;
  const hourText = hp ? `${hp.cgHanja}${hp.jjHanja}` : '시간 미상';

  const daeunText = daeunList
    .map(
      (d) =>
        `${d.startAge}~${d.endAge}세 (${d.startYear}~${d.endYear}년): ${d.cgHanja}${d.jjHanja} (${d.cg}${d.jj}) — ${d.cgOhaeng}/${d.jjOhaeng}`,
    )
    .join('\n');

  const system = `당신은 30년 경력의 사주명리학 전문가입니다.
사용자의 사주와 대운 흐름을 바탕으로 평생 운세를 깊이 있고 구체적으로 분석합니다.
각 인생 시기별 운세와 대운의 의미를 쉽고 따뜻하게 설명해주세요.
반드시 JSON 형식으로만 답변하세요.`;

  const user = `다음 사주와 대운을 바탕으로 평생 운세를 분석해주세요.

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

[대운 흐름] (${direction}, 대운 시작: ${daeunStartAge}세)
${daeunText}

다음 JSON 형식으로 답변하세요. 각 항목은 충분히 구체적으로 작성하세요:
{
  "overview": "타고난 사주의 전반적인 특성과 인생 전체 흐름 요약 (5~6문장)",
  "youth": "유년기~청년기 (대운 초반) 운세와 특징 (4~5문장)",
  "middle": "중년기 운세, 전성기 시기와 주의점 (4~5문장)",
  "senior": "노년기 운세와 인생 후반의 흐름 (3~4문장)",
  "daeunSummaries": [
    { "period": "N~M세", "summary": "이 대운의 핵심 기운과 주요 이벤트 (2~3문장)" }
    // 모든 대운에 대해 작성
  ],
  "advice": "이 사주를 가진 사람에게 드리는 인생 핵심 조언 (4~5문장)"
}`;

  return { system, user };
}

// ─── Action (POST /api/lifetime-interpret) ────────────────

export async function lifetimeInterpretAction({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') throw new MethodNotAllowedException();

  try {
    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException();

    const body = (await request.json()) as LifetimeRequest & { requestAi?: boolean };
    const { gender, year, month, day, hour, requestAi } = body;

    if (!gender || !year || !month || !day) throw new InvalidException('입력값 누락');

    const saju = calcSaju(year, month, day, hour ?? null);
    const currentYear = new Date().getFullYear();
    const { daeunStartAge, direction, daeunList } = calcDaeun(
      year,
      month,
      day,
      gender,
      saju.monthPillar.cg,
      saju.monthPillar.jj,
      currentYear,
    );

    // 계산 결과만 요청 (AI 없음)
    if (!requestAi) {
      const cacheKey = makeLifetimeCacheKey(year, month, day, hour ?? null, gender);
      const existing = await LifetimeAiCache.findOne({
        userId: user.id,
        cacheKey,
      }).lean();

      const aiCache = existing
        ? existing.interpretation
          ? {
              ai: existing.interpretation as LifetimeAiInterpretation,
              model: existing.model,
            }
          : { pending: true as const }
        : undefined;

      return data({ saju, daeunList, daeunStartAge, direction, input: body, aiCache });
    }

    // AI 해석 요청
    const cacheKey = makeLifetimeCacheKey(year, month, day, hour ?? null, gender);
    const existing = await LifetimeAiCache.findOne({ userId: user.id, cacheKey }).lean();

    if (existing?.interpretation) {
      return data<LifetimeAiResponse>({
        ai: existing.interpretation as LifetimeAiInterpretation,
        model: existing.model,
        remainingTokens: 0,
      });
    }

    // 토큰 차감
    const { balanceAfter: remainingTokens } = await deductTokens(
      user.id,
      TOKEN_COST_LIFETIME_AI,
      '평생 운세 AI 해석',
    );

    const model = getModelForContent('lifetime');
    const { system, user: userPrompt } = buildPrompt(
      body,
      saju,
      daeunList,
      direction,
      daeunStartAge,
    );

    // pending 캐시 생성
    await LifetimeAiCache.findOneAndUpdate(
      { userId: user.id, cacheKey },
      {
        userId: user.id,
        cacheKey,
        input: body,
        interpretation: null,
        model,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true },
    );

    const raw = await chatCompletion({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      jsonMode: true,
      maxTokens: 3000,
    });
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
    const ai = JSON.parse(cleaned) as LifetimeAiInterpretation;

    await LifetimeAiCache.findOneAndUpdate(
      { userId: user.id, cacheKey },
      { interpretation: ai },
    );

    return data<LifetimeAiResponse>({ ai, model, remainingTokens });
  } catch (e) {
    return handleServerError(e);
  }
}
