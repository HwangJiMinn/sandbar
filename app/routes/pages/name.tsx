import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useOutletContext,
} from 'react-router';
import { Link } from 'react-router';

import { getAdCreditExpiresAt } from '~/.server/controllers/ad.controller';
import { getSessionUser } from '~/.server/services/session.service';
import { AdCreditModal } from '~/components/ad/ad-credit-modal';
import { TokenIcon } from '~/components/ui/token-icon';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import type { NameAiResponse, NameCalcResponse, NameRequest } from '~/lib/name-types';
import { TOKEN_COST_NAME_AI } from '~/lib/token-constants';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

// ─── Meta ──────────────────────────────────────────────────

export const meta: MetaFunction = () => [
  { title: '이름풀이 | 운결' },
  {
    name: 'description',
    content: '이름의 획수·오행·음양으로 보는 성명학 분석과 AI 종합 해석',
  },
];

// ─── Loader ────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);

  let adCreditExpiresAt: string | null = null;
  if (user) {
    const creditExpiry = await getAdCreditExpiresAt(user.id);
    adCreditExpiresAt = creditExpiry ? creditExpiry.toISOString() : null;
  }

  return data({ adCreditExpiresAt });
};

// ─── 오행 색상 ──────────────────────────────────────────────

const OHAENG_COLOR: Record<
  string,
  { bg: string; text: string; border: string; emoji: string }
> = {
  목: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    emoji: '🌿',
  },
  화: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    emoji: '🔥',
  },
  토: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    emoji: '🌾',
  },
  금: {
    bg: 'bg-slate-400/15',
    text: 'text-slate-300',
    border: 'border-slate-400/30',
    emoji: '⚙️',
  },
  수: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    emoji: '💧',
  },
};

const YIN_YANG_COLOR: Record<string, { text: string; label: string }> = {
  양: { text: 'text-orange-300', label: '양(陽)' },
  음: { text: 'text-indigo-300', label: '음(陰)' },
  중: { text: 'text-foreground/50', label: '중(中)' },
};

const GYK_LABEL: Record<string, { title: string; hanja: string; desc: string }> = {
  won: { title: '원격', hanja: '元格', desc: '이름의 중심 운' },
  hyeong: { title: '형격', hanja: '亨格', desc: '사회적 발전 운' },
  i: { title: '이격', hanja: '利格', desc: '대인관계 운' },
  jeong: { title: '정격', hanja: '貞格', desc: '총합 인생 운' },
};

// ─── 애니메이션 variants ───────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemFade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ─── 로딩 뷰 ──────────────────────────────────────────────

function LoadingView({ message }: { message: string }) {
  return (
    <motion.div
      key="loading"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center gap-4 py-16"
    >
      <motion.div
        className="text-4xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        ✍️
      </motion.div>
      <p className="text-sm text-foreground/50">{message}</p>
    </motion.div>
  );
}

// ─── 이름 분석 결과 컴포넌트 ──────────────────────────────

interface NameResultProps {
  calcResult: NameCalcResponse;
  aiResult: NameAiResponse | null;
  isLoadingAi: boolean;
  isLoggedIn: boolean;
  tokenBalance: number | null;
  adCreditExpiresAt: string | null;
  onRequestAi: () => void;
  onReset: () => void;
  onOpenAdModal: () => void;
}

function NameResult({
  calcResult,
  aiResult,
  isLoadingAi,
  isLoggedIn,
  tokenBalance,
  onRequestAi,
  onReset,
}: NameResultProps) {
  const { calc } = calcResult;
  const allChars = [...calc.surnameChars, ...calc.givenNameChars];
  const hasEnoughTokens = tokenBalance != null && tokenBalance >= TOKEN_COST_NAME_AI;

  const gyeoks = [
    { key: 'won', value: calc.wonGyeok },
    { key: 'hyeong', value: calc.hyeongGyeok },
    { key: 'i', value: calc.iGyeok },
    { key: 'jeong', value: calc.jeongGyeok },
  ];

  // 오행 통계
  const ohaengCount: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  allChars.forEach((c) => ohaengCount[c.ohaeng]++);

  return (
    <motion.div
      key="name-result"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* ── 이름 헤더 ── */}
      <motion.div
        variants={itemFade}
        className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-purple-950/40 p-6 text-center"
      >
        <p className="mb-1 text-xs text-foreground/40">성명학 분석</p>
        <div className="mb-3 flex items-center justify-center gap-3">
          {allChars.map((c, i) => {
            const oh = OHAENG_COLOR[c.ohaeng];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`rounded-xl border px-3 py-1.5 text-2xl font-black ${oh.bg} ${oh.border} text-foreground`}
                >
                  {c.char}
                </span>
                <span className={`text-[10px] font-semibold ${oh.text}`}>{c.ohaeng}</span>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-foreground/50">
          {calcResult.input.gender} · 총획 {calc.jeongGyeok}획
        </p>
      </motion.div>

      {/* ── 글자별 상세 분석 ── */}
      <motion.div variants={itemFade} className="space-y-2">
        <p className="text-xs font-semibold text-foreground/40">글자별 분석</p>
        <div className="grid grid-cols-1 gap-2">
          {allChars.map((c, i) => {
            const oh = OHAENG_COLOR[c.ohaeng];
            const yy = YIN_YANG_COLOR[c.yinYang];
            const isSurname = i < calc.surnameChars.length;
            return (
              <div
                key={i}
                className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${oh.bg} ${oh.border}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/40 text-xl font-black text-foreground">
                  {c.char}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground/40">
                      {isSurname ? '성(姓)' : '이름'}
                    </span>
                    <span className={`text-xs font-bold ${oh.text}`}>
                      {oh.emoji} {c.ohaeng}(木火土金水 중)
                    </span>
                    <span className={`text-xs font-semibold ${yy.text}`}>{yy.label}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground/70">획수 {c.strokes}획</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── 원형이정 격수 ── */}
      <motion.div variants={itemFade} className="space-y-2">
        <p className="text-xs font-semibold text-foreground/40">
          원형이정 격수 (元亨利貞格)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {gyeoks.map(({ key, value }) => {
            const g = GYK_LABEL[key];
            return (
              <div
                key={key}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-secondary/30 p-3 text-center"
              >
                <span className="text-[10px] text-foreground/40">{g.hanja}</span>
                <span className="text-2xl font-black text-foreground">{value}</span>
                <span className="text-xs font-semibold text-violet-400">{g.title}</span>
                <span className="text-[10px] text-foreground/40">{g.desc}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── 오행 흐름 ── */}
      <motion.div variants={itemFade} className="space-y-2">
        <p className="text-xs font-semibold text-foreground/40">오행 흐름</p>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          {/* 흐름 화살표 */}
          <div className="mb-3 flex items-center justify-center gap-1">
            {calc.ohaengFlow.map((oh, i) => {
              const c = OHAENG_COLOR[oh];
              return (
                <div key={i} className="flex items-center gap-1">
                  <span
                    className={`rounded-lg border px-2 py-1 text-xs font-bold ${c.bg} ${c.border} ${c.text}`}
                  >
                    {oh}
                  </span>
                  {i < calc.ohaengFlow.length - 1 && (
                    <span className="text-xs text-foreground/20">→</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* 오행 분포 */}
          <div className="flex justify-center gap-3">
            {Object.entries(ohaengCount).map(([oh, cnt]) => {
              if (cnt === 0) return null;
              const c = OHAENG_COLOR[oh];
              return (
                <div key={oh} className="flex flex-col items-center gap-0.5">
                  <span className={`text-lg ${c.text}`}>{c.emoji}</span>
                  <span className={`text-[10px] font-bold ${c.text}`}>
                    {oh} ×{cnt}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── 음양 배열 ── */}
      <motion.div variants={itemFade} className="space-y-2">
        <p className="text-xs font-semibold text-foreground/40">음양 배열</p>
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/20 p-4">
          {calc.yinYangFlow.map((yy, i) => {
            const c = YIN_YANG_COLOR[yy];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    yy === '양'
                      ? 'border-orange-500/30 bg-orange-500/15'
                      : yy === '음'
                        ? 'border-indigo-500/30 bg-indigo-500/15'
                        : 'border-border bg-secondary/30'
                  }`}
                >
                  <span className={`text-xs font-black ${c.text}`}>{yy}</span>
                </div>
                <span className="text-[10px] text-foreground/40">
                  {allChars[i]?.char}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── AI 해석 영역 ── */}
      <AnimatePresence mode="wait">
        {aiResult ? (
          <motion.div
            key="ai-result"
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            <motion.div variants={itemFade} className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <p className="text-sm font-bold text-foreground">AI 종합 해석</p>
            </motion.div>
            {[
              { key: 'overall', label: '📋 총평', value: aiResult.ai.overall },
              {
                key: 'personality',
                label: '💫 성격·기질',
                value: aiResult.ai.personality,
              },
              { key: 'fortune', label: '🍀 운세 흐름', value: aiResult.ai.fortune },
              { key: 'career', label: '💼 직업운', value: aiResult.ai.career },
              { key: 'love', label: '💕 연애·관계', value: aiResult.ai.love },
              { key: 'advice', label: '✨ 조언', value: aiResult.ai.advice },
            ].map(({ key, label, value }) => (
              <motion.div
                key={key}
                variants={itemFade}
                className="rounded-xl border border-border bg-secondary/20 p-4"
              >
                <p className="mb-1.5 text-xs font-bold text-foreground/60">{label}</p>
                <p className="text-sm leading-relaxed text-foreground/85">{value}</p>
              </motion.div>
            ))}
            {aiResult.remainingTokens !== -1 && (
              <motion.p
                variants={itemFade}
                className="text-center text-xs text-foreground/30"
              >
                이번 해석에 {TOKEN_COST_NAME_AI}
                결이 사용되었습니다 · 잔액: {aiResult.remainingTokens.toLocaleString()}결
              </motion.p>
            )}
          </motion.div>
        ) : isLoadingAi ? (
          <LoadingView key="ai-loading" message="AI가 이름의 기운을 읽고 있어요..." />
        ) : (
          <motion.div
            key="ai-cta"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-0.5"
          >
            <div className="rounded-[calc(1rem-2px)] bg-background/92 p-6 text-center">
              <motion.p
                className="mb-1 text-3xl"
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                🤖
              </motion.p>
              <h3 className="mb-1 text-base font-bold text-foreground">AI 이름풀이</h3>
              <p className="mb-4 text-sm text-foreground/55">
                성명학 전문가 수준의 AI가 이름의 기운을 깊이 있게 분석합니다
              </p>
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5">
                <span className="text-amber-400">⚡</span>
                <span className="text-sm font-semibold text-amber-300">
                  {TOKEN_COST_NAME_AI}결 사용
                </span>
                {isLoggedIn && tokenBalance != null && (
                  <span className="text-xs text-foreground/40">
                    (잔액: {tokenBalance.toLocaleString()}
                    결)
                  </span>
                )}
              </div>
              {!isLoggedIn ? (
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white"
                >
                  로그인하고 AI 해석 받기
                </Link>
              ) : !hasEnoughTokens ? (
                <div className="space-y-2">
                  <Link
                    to="/tokens"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white"
                  >
                    <TokenIcon className="" /> 충전하러 가기
                  </Link>
                  <p className="text-xs text-rose-400">
                    토큰이 부족합니다. {TOKEN_COST_NAME_AI}결 이상 필요해요.
                  </p>
                </div>
              ) : (
                <motion.button
                  onClick={onRequestAi}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(139,92,246,0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white shadow-lg shadow-violet-500/20"
                >
                  ✍️ AI 이름풀이 시작하기
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 다시 하기 */}
      <motion.button
        onClick={onReset}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-foreground/60 transition-colors hover:border-violet-500/40 hover:text-violet-400"
      >
        ← 다시 분석하기
      </motion.button>
    </motion.div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

type PageState = 'form' | 'loading_calc' | 'result' | 'loading_ai';

interface CalcFetcherRes extends NameCalcResponse {
  error?: { message: string };
}
interface AiFetcherRes extends NameAiResponse {
  error?: { message: string };
  pending?: boolean;
}

export default function NamePage() {
  const { adCreditExpiresAt } = useLoaderData<typeof loader>();
  const { user, tokenBalance, setTokenBalance } =
    useOutletContext<DefaultLayoutContext>();

  const [pageState, setPageState] = useState<PageState>('form');
  const [calcResult, setCalcResult] = useState<NameCalcResponse | null>(null);
  const [aiResult, setAiResult] = useState<NameAiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);

  const [isPolling, setIsPolling] = useState(false);

  // 폼 상태
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [gender, setGender] = useState<'남' | '여' | ''>('');

  // ── 이름 계산 fetcher ──
  const { fetcher: calcFetcher, isLoading: isCalcLoading } =
    useEasyFetcher<CalcFetcherRes>((res) => {
      if (!res) return;
      if (res.error) {
        setError(res.error.message);
        setPageState('form');
        return;
      }
      const calcRes = res as NameCalcResponse;
      setCalcResult(calcRes);

      const { aiCache } = calcRes;
      if (aiCache && 'ai' in aiCache) {
        // 완료된 캐시 → 바로 표시
        setAiResult({ ai: aiCache.ai, model: aiCache.model, remainingTokens: -1 });
        setPageState('result');
      } else if (aiCache && 'pending' in aiCache) {
        // 처리 중인 캐시 → 자동 폴링 시작
        setIsPolling(true);
        setPageState('loading_ai');
        const params = JSON.stringify(calcRes);
        setPendingAiParams(params);
        setTimeout(() => {
          aiFetcher.submit(params, {
            method: 'POST',
            action: '/api/name-interpret',
            encType: 'application/json',
          });
        }, 0);
      } else {
        setPageState('result');
      }
    });

  // ── AI 해석 fetcher ──
  const [pendingAiParams, setPendingAiParams] = useState<string | null>(null);
  const [pollTick, setPollTick] = useState(0);

  const { fetcher: aiFetcher, isLoading: isAiLoading } = useEasyFetcher<AiFetcherRes>(
    (res) => {
      if (!res) return;
      if (res.error) {
        setIsPolling(false);
        setError(res.error.message);
        setPageState('result');
        return;
      }
      if (res.pending) {
        setIsPolling(true);
        setPollTick((t) => t + 1);
        return;
      }
      setIsPolling(false);
      setAiResult(res as NameAiResponse);
      if (res.remainingTokens !== -1) setTokenBalance(res.remainingTokens);
      setPageState('result');
    },
  );

  // pending 응답 시 3초 후 재시도
  useEffect(() => {
    if (pollTick === 0 || !pendingAiParams) return;
    const t = setTimeout(() => {
      aiFetcher.submit(pendingAiParams, {
        method: 'POST',
        action: '/api/name-interpret',
        encType: 'application/json',
      });
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollTick]);

  // ── 광고 크레딧 확인 ──
  const hasAdCredit = (() => {
    if (!adCreditExpiresAt) return false;
    return new Date(adCreditExpiresAt) > new Date();
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim() || !givenName.trim() || !gender) return;

    // 로그인 + 광고 크레딧 체크
    if (!user) return;
    if (!hasAdCredit) {
      setShowAdModal(true);
      return;
    }

    setError(null);
    setAiResult(null);
    setPageState('loading_calc');
    calcFetcher.submit(
      JSON.stringify({
        surname: surname.trim(),
        givenName: givenName.trim(),
        gender,
      } satisfies NameRequest),
      { method: 'POST', action: '/api/name', encType: 'application/json' },
    );
  };

  const handleRequestAi = () => {
    if (!calcResult) return;
    setError(null);
    setIsPolling(true);
    setPageState('loading_ai');
    const params = JSON.stringify(calcResult);
    setPendingAiParams(params);
    aiFetcher.submit(params, {
      method: 'POST',
      action: '/api/name-interpret',
      encType: 'application/json',
    });
  };

  const isFormValid = surname.trim() && givenName.trim() && gender;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 배경 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[600px] rounded-full bg-purple-600/6 blur-[100px]" />
      </div>

      <main className="relative mx-auto max-w-lg px-4 py-10">
        {/* 페이지 타이틀 */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="mb-4 text-5xl"
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatDelay: 5,
              ease: 'easeInOut',
            }}
          >
            ✍️
          </motion.div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            성명학 (姓名學)
          </div>
          <h1 className="text-3xl font-black text-foreground">이름풀이</h1>
          <p className="mt-2 text-sm text-foreground/50">
            획수·오행·음양으로 보는 이름의 기운
          </p>
        </motion.div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {/* ── 폼 ── */}
            {pageState === 'form' && (
              <motion.div
                key="form"
                variants={fadeUp}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {/* 카드 래퍼 */}
                <motion.div
                  className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-0.5"
                  initial={{ opacity: 0, y: 32, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                >
                  <div className="rounded-[calc(1.5rem-2px)] bg-background/95 p-5 sm:p-7">
                    {/* 에러 */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-4 overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      {/* 비로그인 */}
                      {!user ? (
                        <motion.div
                          key="locked"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="py-10 text-center"
                        >
                          <p className="mb-2 text-3xl">🔒</p>
                          <p className="mb-1 text-base font-bold text-foreground">
                            로그인이 필요해요
                          </p>
                          <p className="mb-5 text-sm text-foreground/50">
                            이름풀이는 로그인 후 광고 시청으로 무료 이용 가능합니다
                          </p>
                          <Link
                            to="/login"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg"
                          >
                            로그인하러 가기
                          </Link>
                        </motion.div>
                      ) : !hasAdCredit ? (
                        /* 광고 크레딧 없음 */
                        <motion.div
                          key="no-credit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="py-10 text-center"
                        >
                          <motion.p
                            className="mb-2 text-4xl"
                            animate={{ rotate: [0, -10, 10, 0] }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          >
                            📺
                          </motion.p>
                          <p className="mb-1 text-base font-bold text-foreground">
                            광고 시청 후 무료 이용
                          </p>
                          <p className="mb-5 text-sm text-foreground/50">
                            짧은 광고 한 편을 시청하면{' '}
                            <span className="font-semibold text-violet-400">
                              1시간 동안 무료
                            </span>
                            로 이름풀이를 확인할 수 있어요
                          </p>
                          <motion.button
                            type="button"
                            onClick={() => setShowAdModal(true)}
                            whileHover={{
                              scale: 1.04,
                              boxShadow: '0 0 24px rgba(139,92,246,0.4)',
                            }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-7 py-3 font-bold text-white shadow-lg"
                          >
                            <span>📺</span>
                            광고 보고 1시간 무료 이용
                          </motion.button>
                        </motion.div>
                      ) : (
                        /* 크레딧 있음 → 실제 폼 */
                        <motion.div
                          key="form-inner"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* 이름 미리보기 */}
                          <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-purple-900/20 py-7">
                            <p className="mb-2 text-xs text-foreground/30">분석할 이름</p>
                            <AnimatePresence mode="wait">
                              {surname || givenName ? (
                                <motion.p
                                  key={`${surname}${givenName}`}
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.85 }}
                                  transition={{ duration: 0.2 }}
                                  className="text-4xl font-black tracking-widest text-white"
                                >
                                  {surname}
                                  <span className="text-violet-300">{givenName}</span>
                                </motion.p>
                              ) : (
                                <motion.p
                                  key="placeholder"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="text-2xl font-black tracking-widest text-foreground/15"
                                >
                                  홍 길동
                                </motion.p>
                              )}
                            </AnimatePresence>
                            {gender && (
                              <motion.span
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-0.5 text-xs text-violet-300"
                              >
                                {gender === '남' ? '👦 남자' : '👧 여자'}
                              </motion.span>
                            )}
                          </div>

                          <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 성 + 이름 */}
                            <div className="grid grid-cols-5 gap-3">
                              <div className="col-span-2 space-y-1.5">
                                <label
                                  htmlFor="name-surname"
                                  className="text-xs font-semibold text-foreground/50"
                                >
                                  성 (姓)
                                </label>
                                <input
                                  id="name-surname"
                                  type="text"
                                  value={surname}
                                  onChange={(e) => setSurname(e.target.value)}
                                  placeholder="김"
                                  maxLength={2}
                                  className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-3.5 text-center text-lg font-bold text-foreground placeholder-foreground/20 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                                />
                              </div>
                              <div className="col-span-3 space-y-1.5">
                                <label
                                  htmlFor="name-given"
                                  className="text-xs font-semibold text-foreground/50"
                                >
                                  이름
                                </label>
                                <input
                                  id="name-given"
                                  type="text"
                                  value={givenName}
                                  onChange={(e) => setGivenName(e.target.value)}
                                  placeholder="민준"
                                  maxLength={4}
                                  className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-3.5 text-center text-lg font-bold text-foreground placeholder-foreground/20 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                                />
                              </div>
                            </div>

                            {/* 성별 */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-foreground/50">
                                성별
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {(['남', '여'] as const).map((g) => (
                                  <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGender(g)}
                                    className={`rounded-xl border py-3.5 text-sm font-semibold transition-all ${
                                      gender === g
                                        ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                                        : 'border-border bg-secondary/30 text-foreground/60 hover:border-violet-500/30'
                                    }`}
                                  >
                                    {g === '남' ? '👦 남자' : '👧 여자'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <motion.button
                              type="submit"
                              disabled={!isFormValid || isCalcLoading}
                              whileHover={{ scale: isFormValid ? 1.02 : 1 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 disabled:opacity-40"
                            >
                              ✍️ 이름풀이 분석하기
                            </motion.button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* 하단 설명 */}
                <motion.div
                  className="mt-5 grid grid-cols-3 gap-3 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  {[
                    { icon: '🖊️', label: '획수', desc: '자획의 수리' },
                    { icon: '🌿', label: '오행', desc: '목화토금수' },
                    { icon: '☯️', label: '음양', desc: '기운의 균형' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-secondary/20 px-3 py-4"
                    >
                      <div className="mb-1 text-2xl">{item.icon}</div>
                      <p className="text-xs font-bold text-foreground/70">{item.label}</p>
                      <p className="mt-0.5 text-[10px] text-foreground/35">{item.desc}</p>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* ── 계산 로딩 ── */}
            {pageState === 'loading_calc' && (
              <LoadingView
                key="loading-calc"
                message="이름의 기운을 분석하고 있어요..."
              />
            )}

            {/* ── 결과 ── */}
            {(pageState === 'result' || pageState === 'loading_ai') && calcResult && (
              <NameResult
                key="name-result"
                calcResult={calcResult}
                aiResult={aiResult}
                isLoadingAi={pageState === 'loading_ai' || isAiLoading || isPolling}
                isLoggedIn={!!user}
                tokenBalance={tokenBalance}
                adCreditExpiresAt={adCreditExpiresAt}
                onRequestAi={handleRequestAi}
                onReset={() => {
                  setPageState('form');
                  setCalcResult(null);
                  setAiResult(null);
                  setError(null);
                }}
                onOpenAdModal={() => setShowAdModal(true)}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 광고 모달 */}
      <AdCreditModal
        open={showAdModal}
        onClose={() => setShowAdModal(false)}
        onGranted={() => {
          setShowAdModal(false);
          // 광고 크레딧 획득 후 자동 분석 시작
          if (surname.trim() && givenName.trim() && gender) {
            setError(null);
            setAiResult(null);
            setPageState('loading_calc');
            calcFetcher.submit(
              JSON.stringify({
                surname: surname.trim(),
                givenName: givenName.trim(),
                gender,
              } satisfies NameRequest),
              { method: 'POST', action: '/api/name', encType: 'application/json' },
            );
          }
        }}
      />
    </div>
  );
}
