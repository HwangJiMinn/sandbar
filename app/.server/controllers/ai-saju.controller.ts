import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';

import { deductTokens } from '~/.server/controllers/token.controller';
import { getModelForContent } from '~/.server/lib/ai-models';
import {
  ForbiddenException,
  InvalidException,
  MethodNotAllowedException,
  NotFoundException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { chatCompletion } from '~/.server/lib/openai';
import { handleServerError } from '~/.server/lib/utils';
import { AiSajuSession } from '~/.server/models/ai-saju-session.model';
import { getSessionUser } from '~/.server/services/session.service';
import { calcSaju } from '~/lib/saju-calc';
import type { SajuRequest } from '~/lib/saju-types';
import {
  AI_CHAT_MAX_QUESTIONS,
  AI_CHAT_SESSION_MS,
  AI_CHAT_SUMMARY_EVERY,
  TOKEN_COST_AI_CHAT_SESSION,
} from '~/lib/token-constants';

// ─── 공용 타입 ─────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionInfo {
  sessionId: string;
  expiresAt: string;
  questionCount: number;
  maxQuestions: number;
}

export interface StartSessionResponse {
  sessionInfo: SessionInfo;
  remainingTokens: number;
  firstReply: string; // 사주 초기 분석
}

export interface ChatResponse {
  reply: string;
  sessionInfo: SessionInfo;
  summarized: boolean; // 이번에 요약이 실행됐는지
}

// ─── 사주 시스템 프롬프트 ──────────────────────────────────

function buildSajuSystemPrompt(input: SajuRequest): string {
  const saju = calcSaju(input.year, input.month, input.day, input.hour ?? null);
  const { yearPillar: yp, monthPillar: mp, dayPillar: dp, hourPillar: hp } = saju;
  const hourText = hp
    ? `시주 ${hp.cg}${hp.jj} (${hp.cgHanja}${hp.jjHanja})`
    : '시주 미상';
  const ohaengText = Object.entries(saju.ohaengCount)
    .map(([k, v]) => `${k} ${v}개`)
    .join(' · ');

  return `당신은 30년 경력의 사주명리학 전문가이자 따뜻한 상담사입니다.
아래 사용자의 사주 데이터를 완전히 숙지하고, 자연스러운 대화체로 상담합니다.
계산 결과를 임의로 바꾸지 말고, 제공된 사주 정보를 기준으로 해석하세요.
너무 단정적으로 말하지 말고, 따뜻하지만 현실적인 조언을 포함하세요.
답변은 반드시 2~4문장으로 작성하세요. 마크다운 없이 순수 텍스트로만 답변하세요.

[사용자 사주 정보]
이름: ${input.name || '익명'} · 성별: ${input.gender}
생년월일: ${input.year}년 ${input.month}월 ${input.day}일
년주: ${yp.cg}${yp.jj} (${yp.cgHanja}${yp.jjHanja}) · 월주: ${mp.cg}${mp.jj} (${mp.cgHanja}${mp.jjHanja})
일주: ${dp.cg}${dp.jj} (${dp.cgHanja}${dp.jjHanja}) ← 일간 · ${hourText}
오행: ${ohaengText} · 띠: ${saju.animal}띠 · 일간: ${saju.ilgan}`;
}

// ─── 요약 프롬프트 ─────────────────────────────────────────

async function summarizeConversation(
  messages: ChatMessage[],
  prevSummary: string,
): Promise<string> {
  const model = getModelForContent('ai-chat-summarize');

  const summaryContext = prevSummary
    ? `[이전 요약]\n${prevSummary}\n\n[추가 대화]\n`
    : '';

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  return chatCompletion({
    model,
    messages: [
      {
        role: 'system',
        content:
          '사주 상담 대화를 핵심만 간결하게 요약하세요. 중요한 질문과 답변의 요점을 3~5문장으로 정리합니다. 마크다운 없이 순수 텍스트로만 작성하세요.',
      },
      {
        role: 'user',
        content: `${summaryContext}${conversationText}\n\n위 내용을 요약해주세요.`,
      },
    ],
    maxTokens: 500,
    jsonMode: false,
    retries: 1,
  });
}

// ─── Action 1: 세션 시작 ───────────────────────────────────

export const startSessionAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const body = (await request.json()) as {
      birthInfo?: SajuRequest;
      sessionId?: string;
    };
    const isResuming = !!body.sessionId && !body.birthInfo;

    let birthInfo: SajuRequest;
    let sessionId: string;
    let remainingTokens: number;

    if (isResuming) {
      // ── 재시도 경로: 페이지가 sessionId만 전달 (초기화 중 새로고침된 케이스) ──
      const session = await AiSajuSession.findOne({
        _id: body.sessionId,
        userId: user.id,
        expiresAt: { $gt: new Date() },
      });
      if (!session) throw new NotFoundException('세션을 찾을 수 없거나 만료되었습니다.');
      if (session.recentMessages.length > 0) {
        // 이미 메시지가 있으면 중복 재시도 → 차단
        throw new ForbiddenException('이미 진행 중인 세션이 있습니다.');
      }
      birthInfo = session.birthInfo as SajuRequest;
      sessionId = String(session._id);
      remainingTokens = await import('~/.server/controllers/token.controller').then((m) =>
        m.getTokenBalance(user.id),
      );
    } else {
      // ── 신규 시작 경로: 폼에서 birthInfo 전달 ──────────────
      const bi = body.birthInfo;
      if (!bi?.year || !bi?.month || !bi?.day)
        throw new InvalidException('생년월일을 입력해주세요.');
      if (!bi?.gender) throw new InvalidException('성별을 선택해주세요.');
      birthInfo = bi;

      // ── 기존 활성 세션 확인 ─────────────────────────────────
      const existing = await AiSajuSession.findOne({
        userId: user.id,
        expiresAt: { $gt: new Date() },
      });

      if (existing) {
        if (existing.recentMessages.length > 0) {
          // 정상 진행 중인 세션 → 중복 시작 차단
          throw new ForbiddenException('이미 진행 중인 세션이 있습니다.');
        }
        // 메시지가 없는 세션 = 이전에 새로고침으로 중단된 세션 → 재사용
        sessionId = String(existing._id);
        remainingTokens = await import('~/.server/controllers/token.controller').then(
          (m) => m.getTokenBalance(user.id),
        );
      } else {
        // ── 신규 세션: 토큰 차감 → 빈 세션 먼저 생성 ──────────
        const tokenResult = await deductTokens(
          user.id,
          TOKEN_COST_AI_CHAT_SESSION,
          `AI 대화형 사주 세션 시작 — ${birthInfo.name || '익명'}`,
        );
        if (!tokenResult.success) {
          throw new InvalidException(tokenResult.error ?? '토큰이 부족합니다.');
        }
        remainingTokens = tokenResult.balanceAfter;

        // 새로고침해도 세션 복원 가능하도록 AI 호출 전에 먼저 생성
        const expiresAtInit = new Date(Date.now() + AI_CHAT_SESSION_MS);
        const created = await AiSajuSession.create({
          userId: user.id,
          birthInfo,
          expiresAt: expiresAtInit,
          questionCount: 0,
          summary: '',
          recentMessages: [],
        });
        sessionId = String(created._id);
      }
    }

    // ── AI 첫 응답 ─────────────────────────────────────────
    const model = getModelForContent('ai-chat');
    const systemPrompt = buildSajuSystemPrompt(birthInfo);
    const firstUserMsg: ChatMessage = {
      role: 'user',
      content: '안녕하세요! 제 사주 전체 운세와 성격, 올해 주요 흐름을 먼저 알려주세요.',
    };

    const firstReply = await chatCompletion({
      model,
      messages: [{ role: 'system', content: systemPrompt }, firstUserMsg],
      maxTokens: 3000,
      jsonMode: false,
      retries: 2,
    });

    const firstAssistantMsg: ChatMessage = { role: 'assistant', content: firstReply };

    // ── 세션 업데이트 (30분 타이머는 AI 응답 시점부터) ─────
    const expiresAt = new Date(Date.now() + AI_CHAT_SESSION_MS);
    await AiSajuSession.updateOne(
      { _id: sessionId },
      {
        $set: {
          birthInfo,
          expiresAt,
          questionCount: 1,
          recentMessages: [firstUserMsg, firstAssistantMsg],
        },
      },
    );

    return data<StartSessionResponse>({
      sessionInfo: {
        sessionId,
        expiresAt: expiresAt.toISOString(),
        questionCount: 1,
        maxQuestions: AI_CHAT_MAX_QUESTIONS,
      },
      remainingTokens,
      firstReply,
    });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action 2: 채팅 메시지 ────────────────────────────────

export const chatAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const body = (await request.json()) as { sessionId: string; message: string };
    const { sessionId, message } = body;

    if (!sessionId) throw new InvalidException('세션 ID가 없습니다.');
    if (!message?.trim()) throw new InvalidException('메시지를 입력해주세요.');

    // ── 원자적 선점: questionCount 증가 + 유효성 검사를 단일 쿼리로 ──
    // AI 호출 전에 카운트를 미리 소비해야 새로고침 악용을 차단할 수 있음
    const session = await AiSajuSession.findOneAndUpdate(
      {
        _id: sessionId,
        userId: user.id,
        expiresAt: { $gt: new Date() },
        questionCount: { $lt: AI_CHAT_MAX_QUESTIONS },
      },
      { $inc: { questionCount: 1 } },
      { new: false }, // 업데이트 전 도큐먼트를 반환
    );

    if (!session) {
      // 왜 실패했는지 상세 에러 반환
      const raw = await AiSajuSession.findOne({ _id: sessionId, userId: user.id }).lean();
      if (!raw) throw new NotFoundException('세션을 찾을 수 없습니다.');
      if (new Date() > raw.expiresAt)
        throw new ForbiddenException('세션이 만료되었습니다.');
      throw new ForbiddenException(`최대 ${AI_CHAT_MAX_QUESTIONS}질문에 도달했습니다.`);
    }

    // session은 $inc 적용 전 도큐먼트이므로 +1이 실제 카운트
    const newQuestionCount = session.questionCount + 1;

    const userMsg: ChatMessage = { role: 'user', content: message.trim() };
    const updatedRecent: ChatMessage[] = [...session.recentMessages, userMsg];

    // ── 사용자 메시지를 AI 호출 전에 먼저 저장 ──────────────
    // 새로고침해도 질문이 복원되고 로딩 상태를 표시할 수 있음
    await AiSajuSession.updateOne(
      { _id: sessionId },
      { $set: { recentMessages: updatedRecent } },
    );

    // ── 컨텍스트 조합: system + (요약) + 최근 대화 ──
    const model = getModelForContent('ai-chat');
    const systemPrompt = buildSajuSystemPrompt(session.birthInfo as SajuRequest);

    const contextMessages: ChatMessage[] = session.summary
      ? [
          { role: 'assistant', content: `[이전 대화 요약]\n${session.summary}` },
          ...updatedRecent,
        ]
      : updatedRecent;

    const reply = await chatCompletion({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...contextMessages],
      maxTokens: 3000,
      jsonMode: false,
      retries: 2,
    });

    const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
    const newRecentMessages: ChatMessage[] = [...updatedRecent, assistantMsg];

    // ── 5질문마다 요약 실행 ──────────────────────────────────
    let newSummary = session.summary;
    let summarized = false;

    if (newQuestionCount % AI_CHAT_SUMMARY_EVERY === 0) {
      try {
        newSummary = await summarizeConversation(newRecentMessages, session.summary);
        summarized = true;
      } catch {
        // 요약 실패해도 채팅은 계속
      }
    }

    // AI 응답 + 요약 저장 (questionCount는 이미 증가됨)
    await AiSajuSession.updateOne(
      { _id: sessionId },
      {
        $set: {
          summary: newSummary,
          recentMessages: summarized ? [] : newRecentMessages,
        },
      },
    );

    return data<ChatResponse>({
      reply,
      sessionInfo: {
        sessionId,
        expiresAt: session.expiresAt.toISOString(),
        questionCount: newQuestionCount,
        maxQuestions: AI_CHAT_MAX_QUESTIONS,
      },
      summarized,
    });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action 3: 세션 취소 ──────────────────────────────────

export const cancelSessionAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const body = (await request.json()) as { sessionId?: string };

    if (body.sessionId) {
      // 특정 세션 취소
      await AiSajuSession.deleteOne({ _id: body.sessionId, userId: user.id });
    } else {
      // 유저의 모든 활성 세션 취소 (안전장치)
      await AiSajuSession.deleteMany({ userId: user.id });
    }

    return data({ ok: true });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Loader: 활성 세션 조회 ────────────────────────────────

export interface ActiveSessionResponse {
  session: SessionInfo | null;
  birthInfo: SajuRequest | null;
}

export const sessionLoader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await getSessionUser(request);
    if (!user) return data<ActiveSessionResponse>({ session: null, birthInfo: null });

    const session = await AiSajuSession.findOne({
      userId: user.id,
      expiresAt: { $gt: new Date() },
    });

    if (!session) return data<ActiveSessionResponse>({ session: null, birthInfo: null });

    return data<ActiveSessionResponse>({
      session: {
        sessionId: String(session._id),
        expiresAt: session.expiresAt.toISOString(),
        questionCount: session.questionCount,
        maxQuestions: AI_CHAT_MAX_QUESTIONS,
      },
      birthInfo: session.birthInfo as SajuRequest,
    });
  } catch (error) {
    return handleServerError(error);
  }
};
