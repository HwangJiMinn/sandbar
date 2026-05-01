import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  data,
  Link,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useOutletContext,
} from 'react-router';

import type {
  ChatMessage,
  ChatResponse,
  SessionInfo,
  StartSessionResponse,
} from '~/.server/controllers/ai-saju.controller';
import { AiSajuSession } from '~/.server/models/ai-saju-session.model';
import { SavedSaju } from '~/.server/models/saved-saju.model';
import { getSessionUser } from '~/.server/services/session.service';
import { ConfirmModal } from '~/components/ui/confirm-modal';
import { TokenIcon } from '~/components/ui/token-icon';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import { HOUR_OPTIONS } from '~/lib/saju-calc';
import type { SajuRequest } from '~/lib/saju-types';
import type { SavedSajuProfile } from '~/lib/saved-saju-types';
import {
  AI_CHAT_MAX_QUESTIONS,
  AI_CHAT_SESSION_MS,
  TOKEN_COST_AI_CHAT_SESSION,
} from '~/lib/token-constants';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

// ─── Loader ────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  let savedProfiles: SavedSajuProfile[] = [];
  let existingSession: SessionInfo | null = null;
  let existingMessages: ChatMessage[] = [];
  let hasSummary = false;

  if (user) {
    const [profilesRaw, activeSession] = await Promise.all([
      SavedSaju.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
      AiSajuSession.findOne({ userId: user.id, expiresAt: { $gt: new Date() } }).lean(),
    ]);

    savedProfiles = profilesRaw.map((p) => ({
      _id: String(p._id),
      userId: String(p.userId),
      label: p.label,
      name: p.name,
      gender: p.gender,
      year: p.year,
      month: p.month,
      day: p.day,
      hour: p.hour ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    if (activeSession) {
      existingSession = {
        sessionId: String(activeSession._id),
        expiresAt: activeSession.expiresAt.toISOString(),
        questionCount: activeSession.questionCount,
        maxQuestions: AI_CHAT_MAX_QUESTIONS,
      };
      existingMessages = (activeSession.recentMessages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      hasSummary = !!activeSession.summary;
    }
  }

  // 세션이 있지만 메시지가 없으면 → 이전 시작 도중 새로고침된 상태
  const isInitializing =
    !!existingSession && existingMessages.length === 0 && !hasSummary;

  return data({
    user,
    savedProfiles,
    existingSession,
    existingMessages,
    hasSummary,
    isInitializing,
  });
};

export const meta: MetaFunction = () => [
  { title: 'AI 대화형 사주 | 운결' },
  { name: 'description', content: '3000토큰으로 30분간 AI 사주 전문가와 무제한 대화' },
];

// ─── 상수 ──────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const YEARS = Array.from({ length: 100 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const SUGGESTIONS = [
  '올해 전체 운세를 봐줘',
  '연애운이 어때?',
  '직장 옮겨도 될까?',
  '재물운 언제 좋아져?',
  '결혼 시기가 언제야?',
  '타고난 성격이 어때?',
  '올해 건강 조심할 게 있어?',
  '이직하기 좋은 시기야?',
  '사업 시작해도 돼?',
  '대인관계 조심할 점이 있어?',
  '이번 달 운세 알려줘',
  '나한테 맞는 직업이 뭐야?',
];

const selectCls =
  'w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-violet-500/60 transition-colors';

// ─── 남은 시간 포맷 ────────────────────────────────────────

function formatMs(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// ─── 채팅 버블 ─────────────────────────────────────────────

function ChatBubble({ msg, isNew }: { msg: ChatMessage; isNew?: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={isNew ? { opacity: 0, y: 10, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {!isUser && (
        <div className="mt-1 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-sm shadow">
          🔮
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-tr-sm bg-gradient-to-br from-violet-600 to-purple-600 text-white'
            : 'rounded-tl-sm border border-border bg-secondary/40 text-foreground'
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="mt-1 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-sm shadow">
        🔮
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-secondary/40 px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-violet-400"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── 세션 타이머 ───────────────────────────────────────────

function SessionTimer({
  expiresAt,
  questionCount,
  onExpire,
}: {
  expiresAt: string;
  questionCount: number;
  onExpire: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(
    () => new Date(expiresAt).getTime() - Date.now(),
  );

  useEffect(() => {
    const iv = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) {
        clearInterval(iv);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, onExpire]);

  const pct = remainingMs / AI_CHAT_SESSION_MS;
  const isLow = remainingMs < 5 * 60 * 1000; // 5분 미만

  return (
    <div className="flex items-center gap-3">
      {/* 시간 */}
      <div
        className={`flex items-center gap-1 text-xs font-semibold ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}
      >
        <motion.span
          animate={isLow ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ⏱
        </motion.span>
        {formatMs(remainingMs)}
      </div>
      {/* 질문 수 */}
      <div className="text-xs text-foreground/40">
        {questionCount} / {AI_CHAT_MAX_QUESTIONS}질문
      </div>
      {/* 프로그레스 바 */}
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:block">
        <motion.div
          className={`h-full rounded-full ${isLow ? 'bg-rose-500' : 'bg-emerald-500'}`}
          animate={{ width: `${Math.max(0, pct * 100)}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

interface FormState {
  name: string;
  gender: '남' | '여' | '';
  year: string;
  month: string;
  day: string;
  hour: string;
}

const defaultForm: FormState = {
  name: '',
  gender: '',
  year: '',
  month: '',
  day: '',
  hour: '-1',
};

interface StartRes extends StartSessionResponse {
  error?: { message: string };
}
interface ChatRes extends ChatResponse {
  error?: { message: string };
}

export default function AiSajuPage() {
  const {
    user,
    savedProfiles,
    existingSession,
    existingMessages,
    hasSummary,
    isInitializing,
  } = useLoaderData<typeof loader>();
  const { tokenBalance: initBalance, setTokenBalance: setContextTokenBalance } =
    useOutletContext<DefaultLayoutContext>();

  // isInitializing: 세션은 있지만 메시지가 없음 → 시작 도중 새로고침된 케이스
  const [step, setStep] = useState<'form' | 'chat' | 'expired'>(() =>
    existingSession ? 'chat' : 'form',
  );
  const [form, setForm] = useState<FormState>(defaultForm);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    existingMessages.length > 0 ? existingMessages : [],
  );
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(
    existingSession ?? null,
  );
  const [input, setInput] = useState('');
  const [tokenBalance, setTokenBalance] = useState<number | null>(initBalance);
  const [error, setError] = useState<string | null>(null);
  const [newMsgIdx, setNewMsgIdx] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isRestored] = useState(!!existingSession && !isInitializing);

  // 마지막 메시지가 user면 AI 응답 대기 중이었던 것 (새로고침 복원)
  const lastMsg = existingMessages[existingMessages.length - 1];
  const [isPendingRestore] = useState(!!existingSession && lastMsg?.role === 'user');

  const bottomRef = useRef<HTMLDivElement>(null);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const isFormValid = form.gender && form.year && form.month && form.day;

  // ── 세션 시작 fetcher ──
  const { fetcher: startFetcher, isLoading: isStarting } = useEasyFetcher<StartRes>(
    (res) => {
      if (!res) return;
      if (res.error) {
        setError(res.error.message);
        return;
      }
      setSessionInfo(res.sessionInfo);
      setTokenBalance(res.remainingTokens);
      setContextTokenBalance(res.remainingTokens);
      const aiMsg: ChatMessage = { role: 'assistant', content: res.firstReply };
      setMessages([aiMsg]);
      setNewMsgIdx(0);
      setError(null);
      setStep('chat');
    },
  );

  // ── 세션 취소 fetcher ──
  const { fetcher: cancelFetcher } = useEasyFetcher(() => {});

  const cancelSession = (sid?: string | null) => {
    cancelFetcher.submit(JSON.stringify({ sessionId: sid ?? undefined }), {
      method: 'POST',
      action: '/api/ai-saju-cancel',
      encType: 'application/json',
    });
  };

  // ── 채팅 fetcher ──
  const { fetcher: chatFetcher, isLoading: isChatting } = useEasyFetcher<ChatRes>(
    (res) => {
      if (!res) return;
      if (res.error) {
        setError(res.error.message);
        return;
      }
      const aiMsg: ChatMessage = { role: 'assistant', content: res.reply };
      setMessages((prev) => {
        const next = [...prev, aiMsg];
        setNewMsgIdx(next.length - 1);
        return next;
      });
      setSessionInfo(res.sessionInfo);
      setError(null);
    },
  );

  // ── 자동 재시도: 시작 도중 새로고침된 경우 ──────────────────
  useEffect(() => {
    if (!isInitializing || !existingSession || !user) return;
    // 세션의 birthInfo를 서버에서 가져와야 하므로 sessionId를 같이 전달
    startFetcher.submit(JSON.stringify({ sessionId: existingSession.sessionId }), {
      method: 'POST',
      action: '/api/ai-saju',
      encType: 'application/json',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    if (!isFormValid || !user) return;
    setError(null);
    const birthInfo: SajuRequest = {
      name: form.name,
      gender: form.gender as '남' | '여',
      year: Number(form.year),
      month: Number(form.month),
      day: Number(form.day),
      hour: Number(form.hour) === -1 ? null : Number(form.hour),
    };
    startFetcher.submit(JSON.stringify({ birthInfo }), {
      method: 'POST',
      action: '/api/ai-saju',
      encType: 'application/json',
    });
  };

  const sendMessage = () => {
    if (!input.trim() || isChatting || !sessionInfo) return;
    if (sessionInfo.questionCount >= AI_CHAT_MAX_QUESTIONS) {
      setError(`최대 ${AI_CHAT_MAX_QUESTIONS}질문에 도달했습니다.`);
      return;
    }
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      setNewMsgIdx(next.length - 1);
      return next;
    });
    setInput('');
    setError(null);
    chatFetcher.submit(
      JSON.stringify({ sessionId: sessionInfo.sessionId, message: userMsg.content }),
      { method: 'POST', action: '/api/ai-saju-chat', encType: 'application/json' },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetSession = (skipCancel = false) => {
    if (!skipCancel) {
      // DB 세션 삭제 (현재 sessionId 또는 유저의 모든 세션)
      cancelSession(sessionInfo?.sessionId);
    }
    setStep('form');
    setMessages([]);
    setSessionInfo(null);
    setError(null);
    setInput('');
  };

  const isLoading = isStarting || isChatting;
  const questionsLeft = sessionInfo
    ? AI_CHAT_MAX_QUESTIONS - sessionInfo.questionCount
    : AI_CHAT_MAX_QUESTIONS;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ConfirmModal
        open={showCancelModal}
        title="상담을 취소할까요?"
        description="현재 대화 내용이 모두 삭제됩니다. 취소된 세션은 복구할 수 없어요."
        confirmLabel="상담 취소"
        cancelLabel="계속하기"
        confirmVariant="danger"
        onConfirm={() => {
          setShowCancelModal(false);
          resetSession();
        }}
        onCancel={() => setShowCancelModal(false)}
      />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        {/* 브레드크럼 */}
        <motion.div
          className="mb-5 flex items-center gap-3"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            to="/"
            className="text-foreground/40 transition-colors hover:text-foreground"
          >
            ← 홈
          </Link>
          <span className="text-foreground/20">/</span>
          <span className="text-sm font-semibold text-foreground">🤖 AI 대화형 사주</span>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── 입력 폼 ── */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="mb-8 text-center">
                <motion.div
                  className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 18 }}
                >
                  <motion.span
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    🤖
                  </motion.span>
                  <span>AI 사주 전문가와 1:1 상담</span>
                </motion.div>
                <h1 className="mb-2 text-2xl font-black text-foreground sm:text-3xl">
                  생년월일을 알려주세요
                </h1>
                <p className="text-sm text-foreground/50">
                  AI 사주 전문가와 30분간 자유롭게 상담하세요
                </p>
              </div>

              <motion.div
                className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-0.5"
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
              >
                <div className="space-y-5 rounded-[calc(1.5rem-2px)] bg-background/95 p-5 sm:p-7">
                  {/* 저장된 프로필 */}
                  {user && savedProfiles.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-foreground/50">
                        📋 저장된 프로필
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {savedProfiles.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() =>
                              setForm({
                                name: p.name,
                                gender: p.gender,
                                year: String(p.year),
                                month: String(p.month),
                                day: String(p.day),
                                hour: p.hour != null ? String(p.hour) : '-1',
                              })
                            }
                            className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300 transition-all hover:border-violet-400/60 hover:bg-violet-500/20"
                          >
                            {p.label} ({p.name})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 이름 */}
                  <div>
                    <label
                      htmlFor="ai-name"
                      className="mb-1.5 block text-xs font-medium text-foreground/60"
                    >
                      이름 <span className="text-foreground/30">(선택)</span>
                    </label>
                    <input
                      id="ai-name"
                      type="text"
                      placeholder="홍길동"
                      value={form.name}
                      onChange={set('name')}
                      className={selectCls}
                    />
                  </div>

                  {/* 성별 */}
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-foreground/60">성별</p>
                    <div className="flex gap-2">
                      {(['남', '여'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, gender: g }))}
                          className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                            form.gender === g
                              ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                              : 'border-border bg-secondary/30 text-foreground/60 hover:border-foreground/30'
                          }`}
                        >
                          {g === '남' ? '👨 남' : '👩 여'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 생년월일 */}
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-medium text-foreground/60"
                      htmlFor="birthday"
                    >
                      생년월일
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={form.year}
                        onChange={set('year')}
                        className={selectCls}
                      >
                        <option value="">년도</option>
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}년
                          </option>
                        ))}
                      </select>
                      <select
                        value={form.month}
                        onChange={set('month')}
                        className={selectCls}
                      >
                        <option value="">월</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}월
                          </option>
                        ))}
                      </select>
                      <select
                        value={form.day}
                        onChange={set('day')}
                        className={selectCls}
                      >
                        <option value="">일</option>
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}일
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 태어난 시 */}
                  <div>
                    <label
                      htmlFor="ai-hour"
                      className="mb-1.5 block text-xs font-medium text-foreground/60"
                    >
                      태어난 시 <span className="text-foreground/30">(선택)</span>
                    </label>
                    <select
                      id="ai-hour"
                      value={form.hour}
                      onChange={set('hour')}
                      className={selectCls}
                    >
                      {HOUR_OPTIONS.map((h) => (
                        <option key={h.value} value={h.value}>
                          {h.label}
                          {h.range ? ` (${h.range})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 비용 안내 */}
                  {!user ? (
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-center">
                      <p className="mb-3 text-sm text-foreground/60">
                        로그인 후 이용 가능합니다
                      </p>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white"
                      >
                        로그인하러 가기
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground/50">이용요금</span>
                        <span className="text-sm font-bold text-violet-400">
                          ⚡ {TOKEN_COST_AI_CHAT_SESSION.toLocaleString()}
                          <TokenIcon className="ml-0.5" />
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground/40">
                          보유 <TokenIcon className="" />
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            (tokenBalance ?? 0) >= TOKEN_COST_AI_CHAT_SESSION
                              ? 'text-foreground/60'
                              : 'text-rose-400'
                          }`}
                        >
                          {tokenBalance?.toLocaleString() ?? '—'}결
                          {(tokenBalance ?? 0) < TOKEN_COST_AI_CHAT_SESSION &&
                            ' — 충전이 필요해요'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 border-t border-border/50 pt-2 text-[11px] text-foreground/35">
                        <span>⏱ 30분 이용</span>
                        <span>💬 최대 {AI_CHAT_MAX_QUESTIONS}회 질문</span>
                      </div>
                    </div>
                  )}

                  {/* 시작 버튼 */}
                  {user && (tokenBalance ?? 0) < TOKEN_COST_AI_CHAT_SESSION ? (
                    <Link
                      to="/tokens"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-bold text-white shadow-lg"
                    >
                      <TokenIcon className="" /> 충전하러 가기
                    </Link>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={handleStart}
                      disabled={!isFormValid || !user || isStarting}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: '0 0 32px rgba(139,92,246,0.4)',
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 font-bold text-white shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isStarting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          사주 분석 중...
                        </span>
                      ) : (
                        '🤖 AI 사주 상담 시작하기'
                      )}
                    </motion.button>
                  )}
                </div>
              </motion.div>

              {/* 예시 질문 */}
              <motion.div
                className="mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <p className="mb-3 text-center text-xs text-foreground/35">
                  이런 것들을 물어볼 수 있어요
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-secondary/30 px-3 py-1.5 text-xs text-foreground/50"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── 채팅 ── */}
          {step === 'chat' && sessionInfo && (
            <motion.div
              key="chat"
              className="flex flex-col"
              style={{ height: 'calc(100vh - 11rem)' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {/* 채팅 헤더 */}
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-sm shadow">
                    🔮
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">AI 사주 전문가</p>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-foreground/40">온라인</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SessionTimer
                    expiresAt={sessionInfo.expiresAt}
                    questionCount={sessionInfo.questionCount}
                    onExpire={() => setStep('expired')}
                  />
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground/40 transition-colors hover:border-rose-500/40 hover:text-rose-400"
                  >
                    상담 취소
                  </button>
                </div>
              </div>

              {/* 메시지 목록 */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-3">
                {/* 이전 세션 복원 안내 */}
                {isRestored && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-violet-500/20 bg-violet-500/8 px-4 py-2.5 text-center text-xs text-violet-400"
                  >
                    {hasSummary
                      ? '이전 대화를 이어서 진행할 수 있어요 (일부 내용은 AI가 내부적으로 기억하고 있어요)'
                      : '이전 대화를 이어서 진행할 수 있어요'}
                  </motion.div>
                )}
                {isRestored && messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-8 text-center text-sm text-foreground/40"
                  >
                    이전 대화가 정리된 상태예요. 이어서 질문해보세요 🔮
                  </motion.div>
                )}
                {messages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} isNew={i === newMsgIdx} />
                ))}
                {/* 새로고침 복원 시 마지막 질문에 대한 응답 대기 중 */}
                {isPendingRestore && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    <TypingIndicator />
                    <p className="pl-11 text-[11px] text-foreground/30">
                      이전 답변을 불러오는 중이에요
                    </p>
                  </motion.div>
                )}
                {isLoading && <TypingIndicator />}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mx-auto max-w-xs rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-center text-xs text-rose-400"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              {/* 추천 질문 태그 */}
              {!isLoading && questionsLeft > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-xs text-violet-300 transition-all hover:border-violet-400/40 hover:bg-violet-500/10 active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* 질문 한도 경고 */}
              {questionsLeft <= 5 && questionsLeft > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-center text-xs text-amber-400"
                >
                  질문 {questionsLeft}개 남았습니다
                </motion.div>
              )}

              {/* 입력창 */}
              {questionsLeft > 0 ? (
                <div className="flex items-end gap-2 rounded-2xl border border-border bg-secondary/20 p-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      messages.length === 0
                        ? 'AI 응답을 기다리는 중...'
                        : '궁금한 것을 물어보세요!'
                    }
                    rows={1}
                    disabled={isLoading || messages.length === 0}
                    className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-foreground/30 disabled:opacity-50"
                    style={{ maxHeight: '120px' }}
                  />
                  <motion.button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading || messages.length === 0}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow disabled:opacity-40"
                  >
                    {isLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <svg
                        className=""
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                      </svg>
                    )}
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-center text-sm text-foreground/40">
                    최대 {AI_CHAT_MAX_QUESTIONS}질문에 도달했습니다
                  </div>
                  <motion.button
                    onClick={() => resetSession()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg"
                  >
                    새 상담 시작하기
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── 세션 만료 ── */}
          {step === 'expired' && (
            <motion.div
              key="expired"
              className="py-20 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="mb-3 text-5xl">⏰</p>
              <h2 className="mb-2 text-xl font-black text-foreground">
                상담이 종료되었습니다
              </h2>

              <motion.button
                onClick={() => resetSession()}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-7 py-3 font-bold text-white shadow-lg"
              >
                새 상담 시작하기
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
