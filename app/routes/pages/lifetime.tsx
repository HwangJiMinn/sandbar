import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useOutletContext,
} from 'react-router';

import { getAdCreditExpiresAt } from '~/.server/controllers/ad.controller';
import { SavedSaju } from '~/.server/models/saved-saju.model';
import { getSessionUser } from '~/.server/services/session.service';
import { AdCreditModal } from '~/components/ad/ad-credit-modal';
import { TokenIcon } from '~/components/ui/token-icon';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import type {
  DaeunPeriod,
  LifetimeAiInterpretation,
  LifetimeAiResponse,
  LifetimeCalcResponse,
  LifetimeRequest,
} from '~/lib/lifetime-types';
import { HOUR_OPTIONS } from '~/lib/saju-calc';
import type { SavedSajuProfile } from '~/lib/saved-saju-types';
import { TOKEN_COST_LIFETIME_AI } from '~/lib/token-constants';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

// ─── Meta ──────────────────────────────────────────────────

export const meta: MetaFunction = () => [
  { title: '평생 운세 | 운결' },
  { name: 'description', content: '대운 흐름으로 보는 인생 전체 운세와 AI 심층 해석' },
];

// ─── Loader ────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  let savedProfiles: SavedSajuProfile[] = [];
  let adCreditExpiresAt: string | null = null;
  if (user) {
    const [raw, creditExpiry] = await Promise.all([
      SavedSaju.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
      getAdCreditExpiresAt(user.id),
    ]);
    savedProfiles = raw.map((p) => ({
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
    adCreditExpiresAt = creditExpiry ? creditExpiry.toISOString() : null;
  }
  return data({ savedProfiles, adCreditExpiresAt });
};

// ─── 상수 ──────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const YEARS = Array.from({ length: 100 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const OHAENG_COLOR: Record<
  string,
  { bg: string; border: string; text: string; glow: string }
> = {
  목: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
  },
  화: {
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    glow: 'shadow-rose-500/20',
  },
  토: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    glow: 'shadow-amber-500/20',
  },
  금: {
    bg: 'bg-slate-400/15',
    border: 'border-slate-400/30',
    text: 'text-slate-300',
    glow: 'shadow-slate-400/20',
  },
  수: {
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/20',
  },
};

const selectCls =
  'w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-violet-500/60 transition-colors';

// ─── 애니메이션 variants ───────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};

// ─── 폼 state 타입 ─────────────────────────────────────────

interface FormState {
  name: string;
  gender: '' | '남' | '여';
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

// ─── 로딩 뷰 ──────────────────────────────────────────────

function LoadingView({ message }: { message: string }) {
  return (
    <motion.div
      key="loading"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <motion.div
        className="text-5xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        ♾️
      </motion.div>
      <p className="text-sm text-foreground/60">{message}</p>
    </motion.div>
  );
}

// ─── 대운 카드 ─────────────────────────────────────────────

function DaeunCard({
  d,
  aiSummary,
  index,
}: {
  d: DaeunPeriod;
  aiSummary?: string;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const cg = OHAENG_COLOR[d.cgOhaeng] ?? OHAENG_COLOR['토'];
  const jj = OHAENG_COLOR[d.jjOhaeng] ?? OHAENG_COLOR['토'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: EASE }}
      className={`overflow-hidden rounded-2xl border transition-all ${
        d.isCurrent
          ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/10'
          : 'border-border bg-secondary/20'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* 현재 대운 표시 */}
        {d.isCurrent && (
          <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
            현재
          </span>
        )}

        {/* 나이/연도 */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {d.startAge}~{d.endAge}세
          </p>
          <p className="text-xs text-foreground/40">
            {d.startYear}~{d.endYear}년
          </p>
        </div>

        {/* 천간 */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base font-black ${cg.bg} ${cg.border} ${cg.text}`}
        >
          {d.cgHanja}
        </div>
        {/* 지지 */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base font-black ${jj.bg} ${jj.border} ${jj.text}`}
        >
          {d.jjHanja}
        </div>

        {/* 오행 */}
        <div className="hidden shrink-0 flex-col items-end sm:flex">
          <span className={`text-xs font-semibold ${cg.text}`}>{d.cgOhaeng}</span>
          <span className={`text-xs font-semibold ${jj.text}`}>{d.jjOhaeng}</span>
        </div>

        {/* 토글 */}
        <motion.span
          className="shrink-0 text-xs text-foreground/30"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && aiSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-4 py-3">
              <p className="text-xs leading-relaxed text-foreground/70">{aiSummary}</p>
            </div>
          </motion.div>
        )}
        {open && !aiSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-4 py-3">
              <p className="text-xs text-foreground/30">
                AI 해석을 요청하면 이 시기의 분석을 볼 수 있어요
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 결과 뷰 ──────────────────────────────────────────────

function LifetimeResult({
  calcResult,
  aiResult,
  isLoadingAi,
  tokenBalance,
  onRequestAi,
  onReset,
}: {
  calcResult: LifetimeCalcResponse;
  aiResult: LifetimeAiInterpretation | null;
  isLoadingAi: boolean;
  tokenBalance: number | null;
  onRequestAi: () => void;
  onReset: () => void;
}) {
  const { saju, daeunList, daeunStartAge, direction, input } = calcResult;
  const currentDaeun = daeunList.find((d) => d.isCurrent);

  const sections = aiResult
    ? [
        { label: '인생 총운', icon: '♾️', content: aiResult.overview },
        { label: '유년 · 청년기', icon: '🌱', content: aiResult.youth },
        { label: '중년기', icon: '🌿', content: aiResult.middle },
        { label: '노년기', icon: '🍂', content: aiResult.senior },
        { label: '핵심 조언', icon: '💡', content: aiResult.advice },
      ]
    : [];

  return (
    <motion.div
      key="result"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-6"
    >
      {/* 사주 요약 + 대운 정보 */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-purple-900/20 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground/40">
              {input.name || '익명'} · {input.gender} · {input.year}년생
            </p>
            <div className="mt-1 flex items-center gap-2">
              {[
                saju.yearPillar,
                saju.monthPillar,
                saju.dayPillar,
                ...(saju.hourPillar ? [saju.hourPillar] : []),
              ].map((p) => (
                <span key={p.label} className="text-sm font-black text-white">
                  {p.cgHanja}
                  {p.jjHanja}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground/40">{direction}</p>
            <p className="text-sm font-bold text-violet-300">
              대운 {daeunStartAge}세 시작
            </p>
          </div>
        </div>

        {/* 현재 대운 강조 */}
        {currentDaeun && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
            <p className="mb-1 text-xs text-violet-400">🔮 현재 대운</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-white">
                {currentDaeun.cgHanja}
                {currentDaeun.jjHanja}
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {currentDaeun.startAge}~{currentDaeun.endAge}세
                </p>
                <p className="text-xs text-foreground/40">
                  {currentDaeun.startYear}~{currentDaeun.endYear}년 ·{' '}
                  <span className={OHAENG_COLOR[currentDaeun.cgOhaeng]?.text}>
                    {currentDaeun.cgOhaeng}
                  </span>
                  /
                  <span className={OHAENG_COLOR[currentDaeun.jjOhaeng]?.text}>
                    {currentDaeun.jjOhaeng}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 대운 타임라인 */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground/70">
          🗂 대운 흐름 (10년 주기)
        </h3>
        <div className="space-y-2">
          {daeunList.map((d, i) => (
            <DaeunCard
              key={d.index}
              d={d}
              index={i}
              aiSummary={aiResult?.daeunSummaries?.[i]?.summary}
            />
          ))}
        </div>
      </div>

      {/* AI 해석 영역 */}
      {!aiResult && !isLoadingAi && (
        <motion.div
          className="rounded-2xl border border-violet-500/20 bg-secondary/20 p-5 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="mb-1 text-2xl">🤖</p>
          <p className="mb-1 text-sm font-bold text-foreground">AI 평생 운세 해석</p>
          <p className="mb-4 text-xs text-foreground/50">
            각 대운별 심층 분석 + 인생 시기별 흐름을 AI가 해석해드려요
          </p>
          <motion.button
            onClick={onRequestAi}
            disabled={(tokenBalance ?? 0) < TOKEN_COST_LIFETIME_AI}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 disabled:opacity-40"
          >
            <TokenIcon className="" />
            {TOKEN_COST_LIFETIME_AI} 토큰으로 AI 해석 받기
          </motion.button>
          {(tokenBalance ?? 0) < TOKEN_COST_LIFETIME_AI && (
            <p className="mt-2 text-xs text-rose-400">
              토큰이 부족합니다 (필요: {TOKEN_COST_LIFETIME_AI}, 보유: {tokenBalance ?? 0}
              )
            </p>
          )}
        </motion.div>
      )}

      {isLoadingAi && (
        <div className="rounded-2xl border border-violet-500/20 bg-secondary/20 p-8 text-center">
          <motion.div
            className="mb-3 text-3xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            ♾️
          </motion.div>
          <p className="text-sm text-foreground/50">평생 운세를 분석하고 있어요...</p>
        </div>
      )}

      {aiResult && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="space-y-4"
        >
          {sections.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-secondary/20 p-5"
            >
              <p className="mb-2 text-sm font-bold text-foreground/70">
                {s.icon} {s.label}
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">{s.content}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* 다시 하기 */}
      <button
        type="button"
        onClick={onReset}
        className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-foreground/50 transition-colors hover:border-violet-500/40 hover:text-violet-400"
      >
        ← 다시 입력하기
      </button>
    </motion.div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function LifetimePage() {
  const { savedProfiles, adCreditExpiresAt } = useLoaderData<typeof loader>();
  const { user, tokenBalance, setTokenBalance } =
    useOutletContext<DefaultLayoutContext>();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [pageState, setPageState] = useState<
    'form' | 'loading' | 'result' | 'loading_ai'
  >('form');
  const [calcResult, setCalcResult] = useState<LifetimeCalcResponse | null>(null);
  const [aiResult, setAiResult] = useState<LifetimeAiInterpretation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adExpiry, setAdExpiry] = useState<string | null>(adCreditExpiresAt);

  const hasCredit = adExpiry ? new Date(adExpiry) > new Date() : false;

  // ── 계산 fetcher ──
  const { fetcher: calcFetcher, isLoading: isCalcLoading } =
    useEasyFetcher<LifetimeCalcResponse>((res) => {
      if (!res) return;
      setCalcResult(res);
      if (res.aiCache && 'ai' in res.aiCache) setAiResult(res.aiCache.ai);
      setPageState('result');
    });

  // ── AI fetcher ──
  const { fetcher: aiFetcher, isLoading: isAiLoading } =
    useEasyFetcher<LifetimeAiResponse>((res) => {
      if (!res) return;
      if ('ai' in res) {
        setAiResult(res.ai);
        if (res.remainingTokens !== undefined) setTokenBalance(res.remainingTokens);
      }
      setPageState('result');
    });

  const isFormValid = form.gender && form.year && form.month && form.day;

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !user) return;
    setError(null);
    setPageState('loading');
    const body: LifetimeRequest & { requestAi: boolean } = {
      name: form.name,
      gender: form.gender as '남' | '여',
      year: Number(form.year),
      month: Number(form.month),
      day: Number(form.day),
      hour: Number(form.hour) === -1 ? null : Number(form.hour),
      requestAi: false,
    };
    calcFetcher.submit(JSON.stringify(body), {
      method: 'POST',
      action: '/api/lifetime-interpret',
      encType: 'application/json',
    });
  };

  const handleRequestAi = () => {
    if (!calcResult) return;
    setPageState('loading_ai');
    const body: LifetimeRequest & { requestAi: boolean } = {
      ...calcResult.input,
      requestAi: true,
    };
    aiFetcher.submit(JSON.stringify(body), {
      method: 'POST',
      action: '/api/lifetime-interpret',
      encType: 'application/json',
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[500px] rounded-full bg-indigo-600/6 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {/* 브레드크럼 */}
        <motion.div
          className="mb-6 flex items-center gap-3 text-sm"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <a
            href="/"
            className="text-foreground/40 transition-colors hover:text-foreground"
          >
            ← 홈
          </a>
          <span className="text-foreground/20">/</span>
          <span className="font-semibold text-foreground">♾️ 평생 운세</span>
        </motion.div>

        {/* 타이틀 */}
        <AnimatePresence>
          {pageState === 'form' && (
            <motion.div
              key="title"
              className="mb-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <motion.div
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 18 }}
              >
                <motion.span
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  ♾️
                </motion.span>
                <span>광고 무료 이용 · AI 해석 {TOKEN_COST_LIFETIME_AI}결</span>
              </motion.div>
              <h1 className="mb-2 text-2xl font-black text-foreground sm:text-3xl">
                인생 전체의 흐름을 확인하세요
              </h1>
              <p className="text-sm text-foreground/50">
                10년 단위 대운으로 보는 평생 운세 · AI 심층 해석은{' '}
                <TokenIcon className="" /> 사용
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 카드 */}
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-0.5"
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.15 }}
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
              {/* ── 폼 ── */}
              {pageState === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
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
                          평생 운세는 로그인 후 광고 시청으로 무료 이용 가능합니다
                        </p>
                        <a
                          href="/login"
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 font-bold text-white shadow-lg"
                        >
                          로그인하러 가기
                        </a>
                      </motion.div>
                    ) : !hasCredit ? (
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
                          로 평생 운세를 확인할 수 있어요
                        </p>
                        <motion.button
                          type="button"
                          onClick={() => setShowAdModal(true)}
                          whileHover={{
                            scale: 1.04,
                            boxShadow: '0 0 24px rgba(139,92,246,0.4)',
                          }}
                          whileTap={{ scale: 0.97 }}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3 font-bold text-white shadow-lg"
                        >
                          <span>📺</span>
                          광고 보고 1시간 무료 이용
                        </motion.button>
                      </motion.div>
                    ) : (
                      /* 크레딧 있음 → 폼 */
                      <motion.form
                        key="form-inner"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleSubmit}
                        className="space-y-5"
                      >
                        <>
                          {/* 저장된 프로필 */}
                          {savedProfiles.length > 0 && (
                            <motion.div
                              className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3"
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <p className="mb-2 text-xs font-semibold text-violet-400">
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
                                        gender: p.gender as '남' | '여',
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
                            </motion.div>
                          )}

                          {/* 이름 */}
                          <div className="space-y-1.5">
                            <label
                              className="text-xs font-semibold text-foreground/50"
                              htmlFor="name"
                            >
                              이름 (선택)
                            </label>
                            <input
                              type="text"
                              value={form.name}
                              onChange={set('name')}
                              placeholder="홍길동"
                              className={selectCls}
                            />
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
                                  onClick={() => setForm((f) => ({ ...f, gender: g }))}
                                  className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                                    form.gender === g
                                      ? 'border-violet-500/50 bg-violet-500/15 text-violet-300'
                                      : 'border-border bg-secondary/30 text-foreground/60 hover:border-violet-500/30'
                                  }`}
                                >
                                  {g === '남' ? '👦 남자' : '👧 여자'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 생년월일 */}
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-foreground/50">
                              생년월일
                            </p>
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
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-foreground/50">
                              태어난 시 (선택)
                            </p>
                            <select
                              value={form.hour}
                              onChange={set('hour')}
                              className={selectCls}
                            >
                              {HOUR_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                  {o.range ? ` — ${o.range}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          <motion.button
                            type="submit"
                            disabled={!isFormValid || isCalcLoading}
                            whileHover={{ scale: isFormValid ? 1.02 : 1 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 disabled:opacity-40"
                          >
                            ♾️ 평생 운세 보기
                          </motion.button>
                        </>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ── 로딩 ── */}
              {pageState === 'loading' && (
                <LoadingView key="loading" message="인생의 흐름을 분석하고 있어요..." />
              )}

              {/* ── 결과 ── */}
              {(pageState === 'result' || pageState === 'loading_ai') && calcResult && (
                <LifetimeResult
                  key="result"
                  calcResult={calcResult}
                  aiResult={aiResult}
                  isLoadingAi={pageState === 'loading_ai' || isAiLoading}
                  tokenBalance={tokenBalance}
                  onRequestAi={handleRequestAi}
                  onReset={() => {
                    setPageState('form');
                    setCalcResult(null);
                    setAiResult(null);
                    setError(null);
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* 광고 모달 */}
      <AdCreditModal
        open={showAdModal}
        onClose={() => setShowAdModal(false)}
        onGranted={(expiresAt) => {
          setAdExpiry(expiresAt);
          setShowAdModal(false);
        }}
      />
    </div>
  );
}
