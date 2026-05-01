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

import { SavedSaju } from '~/.server/models/saved-saju.model';
import { getSessionUser } from '~/.server/services/session.service';
import { AdCreditModal } from '~/components/ad/ad-credit-modal';
import { TokenIcon } from '~/components/ui/token-icon';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import type {
  NewYearAiInterpretation,
  NewYearAiResponse,
  NewYearCalcResponse,
} from '~/lib/new-year-types';
import { HOUR_OPTIONS } from '~/lib/saju-calc';
import type { SavedSajuProfile } from '~/lib/saved-saju-types';
import { TOKEN_COST_NEW_YEAR_AI } from '~/lib/token-constants';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

// ─── Loader ──────────────────────────────────��─────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);

  let savedProfiles: SavedSajuProfile[] = [];

  if (user) {
    const profilesRaw = await SavedSaju.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .lean();
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
  }

  return data({ savedProfiles });
};

export const meta: MetaFunction = () => {
  const year = new Date().getFullYear();
  return [
    { title: `${year}년 신년 운세 | 운결` },
    {
      name: 'description',
      content: `${year}년 한 해 총운과 월별 운세를 AI로 풀어드립니다.`,
    },
  ];
};

// ─── 상수 ─────────────────────��───────────────────────────

const YEARS = Array.from({ length: 100 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};
const stagger = { show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const itemFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};
const scalePop = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
};

const OHAENG_COLOR: Record<string, string> = {
  목: 'bg-emerald-500',
  화: 'bg-rose-500',
  토: 'bg-amber-500',
  금: 'bg-slate-400',
  수: 'bg-blue-500',
};
const OHAENG_TEXT: Record<string, string> = {
  목: 'text-emerald-400',
  화: 'text-rose-400',
  토: 'text-amber-400',
  금: 'text-slate-300',
  수: 'text-blue-400',
};
const OHAENG_EMOJI: Record<string, string> = {
  목: '🌿',
  화: '🔥',
  토: '🪨',
  금: '⚙️',
  수: '💧',
};

const MONTH_NAMES = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

const AI_SECTIONS: {
  key: keyof NewYearAiInterpretation;
  label: string;
  color: string;
}[] = [
  {
    key: 'overview',
    label: '🌟 총운',
    color: 'from-violet-600/40 to-purple-700/30 border-violet-500/40',
  },
  {
    key: 'wealth',
    label: '💰 재물운',
    color: 'from-amber-500/30 to-yellow-600/20 border-amber-400/30',
  },
  {
    key: 'love',
    label: '💕 연애·관계운',
    color: 'from-rose-500/30 to-pink-600/20 border-rose-400/30',
  },
  {
    key: 'career',
    label: '💼 직업·사업운',
    color: 'from-blue-500/30 to-indigo-600/20 border-blue-400/30',
  },
  {
    key: 'health',
    label: '🌿 건강운',
    color: 'from-emerald-500/30 to-green-600/20 border-emerald-400/30',
  },
  {
    key: 'advice',
    label: '✨ 올해의 조언',
    color: 'from-slate-500/30 to-slate-700/20 border-slate-400/30',
  },
];

// ─── 타입 ──────────────────────────────────────────────────

type PageState = 'form' | 'loading_calc' | 'result' | 'loading_ai';

type CalcFetcherRes = NewYearCalcResponse & { error?: { message: string } };
type AiFetcherRes =
  | (NewYearAiResponse & { cached?: true })
  | { pending: true }
  | { error: { message: string } };

interface FormState {
  name: string;
  gender: '남' | '여' | '';
  year: string;
  month: string;
  day: string;
  hour: string;
}

// ─── PillarCard ─────────────────────��──────────────────────

function PillarCard({
  cg,
  jj,
  cgHanja,
  jjHanja,
  cgOhaeng,
  jjOhaeng,
  label,
}: {
  cg: string;
  jj: string;
  cgHanja: string;
  jjHanja: string;
  cgOhaeng: string;
  jjOhaeng: string;
  label: string;
}) {
  return (
    <motion.div
      variants={scalePop}
      whileHover={{ scale: 1.04, transition: { duration: 0.2 } }}
      className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center backdrop-blur-sm"
    >
      <span className="mb-1 text-xs font-semibold text-white/40">{label}</span>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-black text-white">{cgHanja}</span>
        <span className="text-xs text-white/60">{cg}</span>
        <span className={`mt-0.5 text-[10px] font-semibold ${OHAENG_TEXT[cgOhaeng]}`}>
          {OHAENG_EMOJI[cgOhaeng]} {cgOhaeng}
        </span>
      </div>
      <div className="my-1.5 h-px w-full bg-white/10" />
      <div className="flex flex-col items-center">
        <span className="text-2xl font-black text-white">{jjHanja}</span>
        <span className="text-xs text-white/60">{jj}</span>
        <span className={`mt-0.5 text-[10px] font-semibold ${OHAENG_TEXT[jjOhaeng]}`}>
          {OHAENG_EMOJI[jjOhaeng]} {jjOhaeng}
        </span>
      </div>
    </motion.div>
  );
}

// ─── OhaengBar ────────────────────────────��────────────────

function OhaengBar({ ohaengCount }: { ohaengCount: Record<string, number> }) {
  const total = Object.values(ohaengCount).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-2">
      {Object.entries(ohaengCount).map(([key, val], i) => (
        <motion.div
          key={key}
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
        >
          <span className={`w-12 text-right text-xs font-semibold ${OHAENG_TEXT[key]}`}>
            {OHAENG_EMOJI[key]} {key}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className={`h-full rounded-full ${OHAENG_COLOR[key]}`}
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? (val / total) * 100 : 0}%` }}
              transition={{ delay: i * 0.07 + 0.2, duration: 0.7, ease: EASE }}
            />
          </div>
          <span className="w-8 text-xs text-white/40">{val}개</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── 입력 폼 ─────────────────────────────��─────────────────

function NewYearForm({
  onSubmit,
  isLoading,
  initialValues,
}: {
  onSubmit: (v: FormState) => void;
  isLoading: boolean;
  initialValues?: Partial<FormState>;
}) {
  const [form, setForm] = useState<FormState>({
    name: initialValues?.name ?? '',
    gender: initialValues?.gender ?? '',
    year: initialValues?.year ?? '',
    month: initialValues?.month ?? '',
    day: initialValues?.day ?? '',
    hour: initialValues?.hour ?? '-1',
  });
  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const selectCls =
    'w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-violet-500/60 focus:bg-secondary/50 transition-colors';

  return (
    <motion.form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-5"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemFade}>
        <label
          htmlFor="ny-name"
          className="mb-1.5 block text-sm font-medium text-foreground/70"
        >
          이름 <span className="text-foreground/30">(선택)</span>
        </label>
        <input
          id="ny-name"
          type="text"
          placeholder="홍길동"
          value={form.name}
          onChange={set('name')}
          className={selectCls}
        />
      </motion.div>

      <motion.div variants={itemFade}>
        <p className="mb-1.5 text-sm font-medium text-foreground/70">성별</p>
        <div className="flex gap-3">
          {(['남', '여'] as const).map((g) => (
            <motion.button
              key={g}
              type="button"
              onClick={() => setForm((p) => ({ ...p, gender: g }))}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                form.gender === g
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-border bg-secondary/30 text-foreground/60 hover:border-foreground/30'
              }`}
            >
              {g === '남' ? '👨 남자' : '👩 여자'}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemFade}>
        <p className="mb-1.5 text-sm font-medium text-foreground/70">생년월일</p>
        <div className="grid grid-cols-3 gap-2">
          <select value={form.year} onChange={set('year')} className={selectCls} required>
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
            required
          >
            <option value="">월</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <select value={form.day} onChange={set('day')} className={selectCls} required>
            <option value="">일</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div variants={itemFade}>
        <p className="mb-1.5 text-sm font-medium text-foreground/70">
          태어난 시{' '}
          <span className="text-foreground/30">(모르면 &apos;모름&apos; 선택)</span>
        </p>
        <select value={form.hour} onChange={set('hour')} className={selectCls}>
          {HOUR_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
              {h.range ? ` (${h.range})` : ''}
            </option>
          ))}
        </select>
      </motion.div>

      <motion.div variants={itemFade}>
        <motion.button
          type="submit"
          disabled={isLoading || !form.gender || !form.year || !form.month || !form.day}
          whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(139,92,246,0.4)' }}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 font-bold text-white shadow-lg shadow-violet-500/20 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              사주를 계산하고 있어요...
            </span>
          ) : (
            '🌟 신년 운세 보기 (무료)'
          )}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}

// ─── 로딩 뷰 ────────────────────────────��─────────────────

function LoadingView({ message }: { message: string }) {
  return (
    <motion.div
      key="loading"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center gap-6 py-16 text-center"
    >
      <motion.div
        className="relative"
        style={{ width: 80, height: 80 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500" />
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-3xl"
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          🌟
        </motion.span>
      </motion.div>
      <p className="text-lg font-semibold text-foreground">{message}</p>
      <div className="flex gap-2">
        {['✦', '✧', '✦'].map((s, i) => (
          <motion.span
            key={i}
            className="text-2xl text-violet-400/60"
            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          >
            {s}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── 결과 뷰 ────────────────────────────────��─────────────

function NewYearResult({
  calcResult,
  aiResult,
  isLoggedIn,
  tokenBalance,
  isLoadingAi,
  onRequestAi,
  onReset,
}: {
  calcResult: NewYearCalcResponse;
  aiResult: NewYearAiResponse | null;
  isLoggedIn: boolean;
  tokenBalance: number | null;
  isLoadingAi: boolean;
  onRequestAi: () => void;
  onReset: () => void;
}) {
  const { saju, input, targetYear } = calcResult;
  const { yearPillar: yp, monthPillar: mp, dayPillar: dp, hourPillar: hp } = saju;
  const hasEnoughTokens = tokenBalance != null && tokenBalance >= TOKEN_COST_NEW_YEAR_AI;

  return (
    <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* 헤더 정보 */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl border border-violet-500/20 bg-violet-950/30 p-5 text-center"
      >
        <p className="text-4xl font-black text-white">{targetYear}년</p>
        <p className="mt-1 text-sm text-foreground/60">
          {input.name ? `${input.name} · ` : ''}
          {input.year}년 {input.month}월 {input.day}일
          {input.hour !== null
            ? ` · ${HOUR_OPTIONS.find((h) => h.value === input.hour)?.label}`
            : ''}
          {' · '}
          {input.gender}자
        </p>
        <p className="mt-2 text-sm text-violet-300">
          일간(日干):{' '}
          <strong>
            {dp.cg}({dp.cgHanja})
          </strong>{' '}
          · {dp.cgOhaeng}의 기운
        </p>
      </motion.div>

      {/* 사주팔자 */}
      <motion.div variants={fadeUp} transition={{ delay: 0.1 }}>
        <h3 className="mb-3 text-sm font-semibold text-foreground/50">⬛ 사주 팔자</h3>
        <motion.div
          className={`grid gap-3 ${hp ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {hp && <PillarCard {...hp} />}
          <PillarCard {...dp} />
          <PillarCard {...mp} />
          <PillarCard {...yp} />
        </motion.div>
        {!hp && (
          <p className="mt-2 text-center text-xs text-foreground/30">
            ※ 시주는 태어난 시간을 알 때 더 정확한 풀이가 가능합니다
          </p>
        )}
      </motion.div>

      {/* 오행 분포 */}
      <motion.div
        variants={fadeUp}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground/50">🌊 오행 분포</h3>
        <OhaengBar ohaengCount={saju.ohaengCount} />
      </motion.div>

      {/* AI 해석 섹션 */}
      <AnimatePresence mode="wait">
        {aiResult ? (
          <motion.div
            key="ai-done"
            className="space-y-4"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemFade} className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground/50">
                🤖 AI {targetYear}년 신년 운세
              </h3>
            </motion.div>

            {/* 5개 주요 섹션 */}
            {AI_SECTIONS.filter((s) => s.key !== 'monthly').map(
              ({ key, label, color }) => {
                const text = aiResult.ai[key as keyof NewYearAiInterpretation];
                if (typeof text !== 'string') return null;
                return (
                  <motion.div
                    key={key}
                    variants={itemFade}
                    whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                    className={`rounded-2xl bg-gradient-to-br p-0.5 ${color}`}
                  >
                    <div className="rounded-[calc(1rem-2px)] bg-background/92 p-5">
                      <p className="mb-2 text-sm font-bold text-foreground">{label}</p>
                      <p className="text-sm leading-relaxed text-foreground/70">{text}</p>
                    </div>
                  </motion.div>
                );
              },
            )}

            {/* 월별 운세 */}
            {aiResult.ai.monthly?.length === 12 && (
              <motion.div variants={itemFade} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/50">📅 월별 운세</h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {aiResult.ai.monthly.map((text, i) => (
                    <motion.div
                      key={i}
                      variants={itemFade}
                      className="rounded-xl border border-border bg-secondary/20 p-4"
                    >
                      <p className="mb-1.5 text-xs font-bold text-violet-400">
                        {MONTH_NAMES[i]}
                      </p>
                      <p className="text-xs leading-relaxed text-foreground/70">{text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.p
              className="text-center text-xs text-foreground/30"
              variants={itemFade}
            >
              {aiResult.remainingTokens === -1
                ? '이미 받은 해석 결과예요'
                : `이번 해석에 ${TOKEN_COST_NEW_YEAR_AI}`}
              {aiResult.remainingTokens !== -1 && (
                <>
                  결이 사용되었습니다 · 잔액: {aiResult.remainingTokens.toLocaleString()}
                  결
                </>
              )}
            </motion.p>
          </motion.div>
        ) : isLoadingAi ? (
          <LoadingView
            key="ai-loading"
            message={`${targetYear}년 운세를 분석하고 있어요...`}
          />
        ) : (
          <motion.div
            key="ai-cta"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-6 text-center"
          >
            <p className="mb-1 text-2xl">🌟</p>
            <p className="mb-1 text-base font-bold text-foreground">
              {targetYear}년 AI 신년 운세
            </p>
            <p className="mb-5 text-sm text-foreground/50">
              총운 · 재물운 · 연애운 · 직업운 · 건강운 · 월별 운세를 풀어드립니다
            </p>

            {!isLoggedIn ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white"
              >
                로그인하고 AI 해석 받기
              </Link>
            ) : !hasEnoughTokens ? (
              <div className="space-y-3">
                <p className="text-xs text-foreground/40">
                  토큰이 부족합니다 (필요: {TOKEN_COST_NEW_YEAR_AI}
                  결, 보유: {tokenBalance?.toLocaleString() ?? 0}
                  결)
                </p>
                <Link
                  to="/tokens"
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white"
                >
                  <TokenIcon className="" /> 충전하기
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-foreground/40">
                  {TOKEN_COST_NEW_YEAR_AI}결 정밀 풀이 · 잔액{' '}
                  {tokenBalance?.toLocaleString()}결
                </p>
                <motion.button
                  onClick={onRequestAi}
                  whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(139,92,246,0.5)' }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20"
                >
                  🌟 {targetYear}년 AI 신년 운세 받기
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 다시하기 */}
      <motion.div variants={itemFade} className="pt-2 text-center">
        <button
          onClick={onReset}
          className="text-xs text-foreground/40 underline underline-offset-2 transition-colors hover:text-foreground/70"
        >
          다른 정보로 다시 보기
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────���─────────

export default function NewYearPage() {
  const { savedProfiles } = useLoaderData<typeof loader>();
  const { user, tokenBalance, setTokenBalance } =
    useOutletContext<DefaultLayoutContext>();

  const [pageState, setPageState] = useState<PageState>('form');
  const [calcResult, setCalcResult] = useState<NewYearCalcResponse | null>(null);
  const [aiResult, setAiResult] = useState<NewYearAiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedInitial, setSelectedInitial] = useState<Partial<FormState> | undefined>(
    undefined,
  );
  const [showAdModal, setShowAdModal] = useState(false);

  const [isPolling, setIsPolling] = useState(false);

  // ── 계산 fetcher ──
  const { fetcher: calcFetcher, isLoading: isCalcLoading } =
    useEasyFetcher<CalcFetcherRes>((res) => {
      if (!res) return;
      if (res.error) {
        setError(res.error.message);
        setPageState('form');
        return;
      }

      const calcRes = res as NewYearCalcResponse;
      setCalcResult(calcRes);

      const { aiCache } = calcRes;
      if (aiCache && 'ai' in aiCache) {
        setAiResult({ ai: aiCache.ai, model: aiCache.model, remainingTokens: -1 });
        setPageState('result');
      } else if (aiCache && 'pending' in aiCache) {
        setIsPolling(true);
        setPageState('loading_ai');
        const params = JSON.stringify(calcRes);
        setPendingAiParams(params);
        setTimeout(() => {
          aiFetcher.submit(params, {
            method: 'POST',
            action: '/api/new-year-interpret',
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
      if ('error' in res && res.error) {
        setIsPolling(false);
        setError(res.error.message);
        setPageState('result');
        return;
      }
      if ('pending' in res && res.pending) {
        setIsPolling(true);
        setPollTick((t) => t + 1);
        return;
      }
      setIsPolling(false);
      setAiResult(res as NewYearAiResponse);
      if ((res as NewYearAiResponse).remainingTokens !== -1)
        setTokenBalance((res as NewYearAiResponse).remainingTokens);
      setPageState('result');
    },
  );

  // pending 응답 시 3초 후 재시도
  useEffect(() => {
    if (pollTick === 0 || !pendingAiParams) return;
    const t = setTimeout(() => {
      aiFetcher.submit(pendingAiParams, {
        method: 'POST',
        action: '/api/new-year-interpret',
        encType: 'application/json',
      });
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollTick]);

  const handleCalcSubmit = (form: FormState) => {
    setError(null);
    setAiResult(null);
    setPageState('loading_calc');
    calcFetcher.submit(
      {
        name: form.name,
        gender: form.gender,
        year: Number(form.year),
        month: Number(form.month),
        day: Number(form.day),
        hour: Number(form.hour),
      },
      { method: 'POST', action: '/api/new-year', encType: 'application/json' },
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
      action: '/api/new-year-interpret',
      encType: 'application/json',
    });
  };

  const handleReset = () => {
    setPageState('form');
    setCalcResult(null);
    setAiResult(null);
    setError(null);
    setIsPolling(false);
  };

  const targetYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-amber-500/6 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-12">
        {/* 브레드크럼 */}
        <motion.div
          className="mb-8 flex items-center gap-3"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/"
            className="text-foreground/40 transition-colors hover:text-foreground"
          >
            ← 홈
          </Link>
          <span className="text-foreground/20">/</span>
          <span className="text-sm font-semibold text-foreground">
            🌟 {targetYear}년 신년 운세
          </span>
        </motion.div>

        <AnimatePresence>
          {pageState === 'form' && (
            <motion.div
              key="hero"
              className="mb-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="mb-3 text-6xl"
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: 'easeInOut',
                }}
              >
                🌟
              </motion.div>
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {targetYear}년 신년 운세
              </h1>
              <p className="mt-2 text-sm text-foreground/50">
                총운 · 재물운 · 연애운 · 직업운 · 건강운 · 12개월 월별 운세
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                <TokenIcon className="" /> 정밀 풀이 · {TOKEN_COST_NEW_YEAR_AI}결
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* 에러 */}
          {error && (
            <motion.div
              key="error"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {pageState === 'form' && (
            <motion.div
              key="form"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {/* 저장된 프로필 */}
              {savedProfiles && savedProfiles.length > 0 && (
                <motion.div
                  className="mb-5 rounded-xl border border-violet-500/20 bg-violet-950/30 p-3"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="mb-2 text-xs font-semibold text-violet-400">
                    📋 저장된 프로필로 빠르게 입력
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {savedProfiles.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => {
                          setSelectedInitial({
                            name: p.name,
                            gender: p.gender,
                            year: String(p.year),
                            month: String(p.month),
                            day: String(p.day),
                            hour: p.hour != null ? String(p.hour) : '-1',
                          });
                          setFormKey((k) => k + 1);
                        }}
                        className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300 transition-all hover:border-violet-400/60 hover:bg-violet-500/20"
                      >
                        {p.label} ({p.name})
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              <NewYearForm
                key={formKey}
                onSubmit={handleCalcSubmit}
                isLoading={isCalcLoading}
                initialValues={selectedInitial}
              />

              {/* 광고 크레딧 */}
              {!user && (
                <motion.p
                  className="mt-4 text-center text-xs text-foreground/40"
                  variants={itemFade}
                >
                  계산은 무료 · AI 해석은{' '}
                  <Link to="/login" className="text-violet-400 underline">
                    로그인
                  </Link>{' '}
                  후 이용
                </motion.p>
              )}
            </motion.div>
          )}

          {pageState === 'loading_calc' && (
            <LoadingView key="loading-calc" message="사주팔자를 계산하고 있어요..." />
          )}

          {(pageState === 'result' || pageState === 'loading_ai') && calcResult && (
            <motion.div key="result" variants={fadeUp} initial="hidden" animate="show">
              <NewYearResult
                calcResult={calcResult}
                aiResult={aiResult}
                isLoggedIn={!!user}
                tokenBalance={tokenBalance}
                isLoadingAi={pageState === 'loading_ai' || isAiLoading || isPolling}
                onRequestAi={handleRequestAi}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AdCreditModal
        open={showAdModal}
        onClose={() => setShowAdModal(false)}
        onGranted={() => {
          setShowAdModal(false);
          setTokenBalance(tokenBalance ?? 0);
        }}
      />
    </div>
  );
}
