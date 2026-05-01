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
import { SavedSaju } from '~/.server/models/saved-saju.model';
import { getSessionUser } from '~/.server/services/session.service';
import { AdCreditModal } from '~/components/ad/ad-credit-modal';
import { TokenIcon } from '~/components/ui/token-icon';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import type {
  GunghapAiResponse,
  GunghapCalcResponse,
  PersonInfo,
} from '~/lib/gunghap-types';
import { HOUR_OPTIONS } from '~/lib/saju-calc';
import type { SavedSajuProfile } from '~/lib/saved-saju-types';
import { TOKEN_COST_GUNGHAP_AI } from '~/lib/token-constants';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

// ─── Loader ────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);

  let savedProfiles: SavedSajuProfile[] = [];
  let adCreditExpiresAt: string | null = null;

  if (user) {
    const [rawProfiles, creditExpiry] = await Promise.all([
      SavedSaju.find({ userId: user.id }).sort({ createdAt: -1 }).lean(),
      getAdCreditExpiresAt(user.id),
    ]);
    savedProfiles = rawProfiles.map((p) => ({
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

export const meta: MetaFunction = () => [
  { title: '궁합 풀이 | 운결' },
  { name: 'description', content: '두 사람의 사주로 보는 정통 AI 궁합풀이' },
];

// ─── 상수 ──────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const YEARS = Array.from({ length: 100 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const AI_SECTIONS = [
  { key: 'overall', label: '💫 전체 궁합 총평', color: 'from-violet-600 to-purple-700' },
  {
    key: 'firstImpression',
    label: '✨ 첫 만남 & 인연',
    color: 'from-rose-500 to-pink-600',
  },
  { key: 'communication', label: '💬 소통 궁합', color: 'from-sky-500 to-blue-600' },
  { key: 'romance', label: '💘 연애 궁합', color: 'from-pink-500 to-rose-600' },
  { key: 'marriage', label: '💍 결혼 궁합', color: 'from-amber-500 to-orange-500' },
  { key: 'challenges', label: '⚡ 주의할 점', color: 'from-slate-500 to-gray-600' },
  { key: 'advice', label: '🔮 두 사람에게 조언', color: 'from-indigo-500 to-violet-600' },
] as const;

// ─── Score 색상 ────────────────────────────────────────────

function scoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.8) return 'text-emerald-400';
  if (pct >= 0.6) return 'text-violet-400';
  if (pct >= 0.4) return 'text-amber-400';
  return 'text-rose-400';
}

function scoreBarColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.8) return 'from-emerald-500 to-teal-500';
  if (pct >= 0.6) return 'from-violet-500 to-purple-500';
  if (pct >= 0.4) return 'from-amber-500 to-orange-500';
  return 'from-rose-500 to-pink-500';
}

// ─── SVG 점수 게이지 ────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const pct = score / 100;
  const offset = circumference * (1 - pct);

  const color =
    score >= 80
      ? '#34d399'
      : score >= 60
        ? '#a78bfa'
        : score >= 40
          ? '#fbbf24'
          : '#f87171';

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 140, height: 140 }}
    >
      <svg width={140} height={140} className="-rotate-90">
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="text-4xl font-black text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.5,
            type: 'spring' as const,
            stiffness: 200,
            damping: 15,
          }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-white/40">/ 100</span>
      </div>
    </div>
  );
}

// ─── 개인 입력 폼 섹션 ─────────────────────────────────────

interface PersonFormProps {
  label: string;
  emoji: string;
  color: string;
  value: FormPerson;
  onChange: (v: FormPerson) => void;
}

interface FormPerson {
  name: string;
  gender: '남' | '여' | '';
  year: string;
  month: string;
  day: string;
  hour: string;
}

const defaultPerson: FormPerson = {
  name: '',
  gender: '',
  year: '',
  month: '',
  day: '',
  hour: '-1',
};

const selectCls =
  'w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground outline-none focus:border-violet-500/60 focus:bg-secondary/50 transition-colors';

function PersonForm({ label, emoji, color, value, onChange }: PersonFormProps) {
  const set =
    (k: keyof FormPerson) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
      onChange({ ...value, [k]: e.target.value });

  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <p className="mb-4 text-sm font-bold text-foreground">
        {emoji} {label}
      </p>

      {/* 이름 */}
      <div className="mb-3">
        <label
          htmlFor={`name-${label}`}
          className="mb-1.5 block text-xs font-medium text-foreground/60"
        >
          이름 <span className="text-foreground/30">(선택)</span>
        </label>
        <input
          id={`name-${label}`}
          type="text"
          placeholder="홍길동"
          value={value.name}
          onChange={set('name')}
          className={selectCls}
        />
      </div>

      {/* 성별 */}
      <div className="mb-3">
        <p className="mb-1.5 text-xs font-medium text-foreground/60">성별</p>
        <div className="flex gap-2">
          {(['남', '여'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ ...value, gender: g })}
              className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                value.gender === g
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
      <div className="mb-3">
        <p className="mb-1.5 text-xs font-medium text-foreground/60">생년월일</p>
        <div className="grid grid-cols-3 gap-1.5">
          <select
            value={value.year}
            onChange={set('year')}
            className={selectCls}
            required
          >
            <option value="">년도</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={value.month}
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
          <select value={value.day} onChange={set('day')} className={selectCls} required>
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
        <p className="mb-1.5 text-xs font-medium text-foreground/60">
          태어난 시 <span className="text-foreground/30">(모르면 모름 선택)</span>
        </p>
        <select value={value.hour} onChange={set('hour')} className={selectCls}>
          {HOUR_OPTIONS.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
              {h.range ? ` (${h.range})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── 로딩 뷰 ──────────────────────────────────────────────

function LoadingView({ message }: { message: string }) {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex flex-col items-center gap-6 py-16 text-center"
    >
      <motion.div className="relative" style={{ width: 80, height: 80 }}>
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-rose-500/20 border-t-rose-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.span
          className="absolute inset-0 flex items-center justify-center text-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          💕
        </motion.span>
      </motion.div>
      <p className="text-lg font-semibold text-foreground">{message}</p>
      <div className="flex gap-2">
        {['♡', '♥', '♡'].map((s, i) => (
          <motion.span
            key={i}
            className="text-xl text-rose-400/60"
            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.25,
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

// ─── 결과 화면 ─────────────────────────────────────────────

const SCORE_LABELS = [
  { key: 'ilgan', label: '일간 관계', max: 25 },
  { key: 'ilje', label: '일지 관계', max: 25 },
  { key: 'ohaeng', label: '오행 조화', max: 25 },
  { key: 'ddi', label: '띠 궁합', max: 25 },
] as const;

const RELATION_LABELS = [
  { key: 'ilganRel', label: '일간' },
  { key: 'iljeRel', label: '일지' },
  { key: 'ohaengDesc', label: '오행' },
  { key: 'ddiDesc', label: '띠' },
] as const;

interface ResultProps {
  calcResult: GunghapCalcResponse;
  tokenBalance: number | null;
  isLoggedIn: boolean;
  aiResult: GunghapAiResponse | null;
  isLoadingAi: boolean;
  onRequestAi: () => void;
  onReset: () => void;
}

function GunghapResult({
  calcResult,
  tokenBalance,
  isLoggedIn,
  aiResult,
  isLoadingAi,
  onRequestAi,
  onReset,
}: ResultProps) {
  const { scores, relation, level, levelEmoji, me, partner } = calcResult;
  const hasEnoughTokens = tokenBalance != null && tokenBalance >= TOKEN_COST_GUNGHAP_AI;

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* 총점 카드 */}
      <motion.div
        className="overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-900/30 to-purple-900/20 p-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        {/* 두 사람 이름 */}
        <motion.div
          className="mb-4 flex items-center justify-center gap-3 text-sm font-semibold text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span>
            {me.input.name || '나'} ({me.saju.animal}띠)
          </span>
          <motion.span
            className="text-xl"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            💕
          </motion.span>
          <span>
            {partner.input.name || '상대방'} ({partner.saju.animal}띠)
          </span>
        </motion.div>

        {/* 게이지 */}
        <div className="mb-3 flex justify-center">
          <ScoreGauge score={scores.total} />
        </div>

        {/* 레벨 */}
        <motion.div
          className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.7,
            type: 'spring' as const,
            stiffness: 220,
            damping: 16,
          }}
        >
          <span className="text-lg">{levelEmoji}</span>
          <span className="text-sm font-bold text-rose-300">{level}</span>
        </motion.div>
      </motion.div>

      {/* 세부 점수 */}
      <motion.div
        className="rounded-2xl border border-border bg-secondary/20 p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
      >
        <h3 className="mb-4 text-sm font-semibold text-foreground/50">📊 항목별 점수</h3>
        <div className="space-y-3">
          {SCORE_LABELS.map(({ key, label, max }, i) => {
            const score = scores[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.35, ease: EASE }}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground/70">{label}</span>
                  <span className={`font-bold ${scoreColor(score, max)}`}>
                    {score} / {max}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${scoreBarColor(score, max)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / max) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.7, ease: EASE }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 관계 상세 */}
      <motion.div
        className="rounded-2xl border border-border bg-secondary/20 p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45, ease: EASE }}
      >
        <h3 className="mb-3 text-sm font-semibold text-foreground/50">🔍 관계 분석</h3>
        <div className="space-y-2">
          {RELATION_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                {label}
              </span>
              <span className="text-foreground/60">{relation[key]}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AI 해석 섹션 */}
      <AnimatePresence mode="wait">
        {aiResult ? (
          // AI 결과
          <motion.div
            key="ai-done"
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="text-sm font-semibold text-foreground/50">🤖 AI 궁합 해석</h3>

            {AI_SECTIONS.map(({ key, label, color }) => {
              const text = aiResult.ai[key as keyof typeof aiResult.ai];
              if (typeof text !== 'string') return null;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className={`rounded-2xl bg-gradient-to-br p-0.5 ${color}`}
                >
                  <div className="rounded-[calc(1rem-2px)] bg-background/92 p-4">
                    <p className="mb-1.5 text-sm font-bold text-foreground">{label}</p>
                    <p className="text-sm leading-relaxed text-foreground/70">{text}</p>
                  </div>
                </motion.div>
              );
            })}

            <motion.p
              className="text-center text-xs text-foreground/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {aiResult.remainingTokens === -1
                ? '오늘 이미 받은 해석 결과예요'
                : `이번 해석에 ${TOKEN_COST_GUNGHAP_AI}결이 사용되었습니다 · 잔액: ${aiResult.remainingTokens.toLocaleString()}결`}
            </motion.p>
          </motion.div>
        ) : isLoadingAi ? (
          <LoadingView key="ai-loading" message="AI가 두 사람의 인연을 읽고 있어요..." />
        ) : (
          // AI CTA
          <motion.div
            key="ai-cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.35, duration: 0.4, ease: EASE }}
            className="rounded-2xl bg-gradient-to-br from-rose-600 to-pink-700 p-0.5"
          >
            <div className="rounded-[calc(1rem-2px)] bg-background/92 p-6 text-center">
              <motion.p
                className="mb-1 text-3xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                💕
              </motion.p>
              <h3 className="mb-1 text-base font-bold text-foreground">AI 궁합 해석</h3>
              <p className="mb-4 text-sm text-foreground/55">
                두 사람의 사주를 바탕으로 연애·결혼 궁합을 깊이 있게 분석합니다
              </p>

              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5">
                <span className="text-amber-400">⚡</span>
                <span className="text-sm font-semibold text-amber-300">
                  {TOKEN_COST_GUNGHAP_AI}결 사용
                </span>
                {isLoggedIn && tokenBalance != null && (
                  <span className="text-xs text-foreground/40">
                    (잔액: {tokenBalance.toLocaleString()}
                    결)
                  </span>
                )}
              </div>

              {!isLoggedIn ? (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-3 font-bold text-white"
                  >
                    로그인하고 AI 궁합 해석 받기
                  </Link>
                  <p className="text-xs text-foreground/40">
                    로그인 후 결을 충전하여 이용하세요
                  </p>
                </div>
              ) : !hasEnoughTokens ? (
                <div className="space-y-2">
                  <Link
                    to="/tokens"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white"
                  >
                    <TokenIcon className="" /> 충전하러 가기
                  </Link>
                  <p className="text-xs text-rose-400">
                    토큰이 부족합니다. {TOKEN_COST_GUNGHAP_AI}결 이상 필요해요.
                  </p>
                </div>
              ) : (
                <motion.button
                  onClick={onRequestAi}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(244,63,94,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-3 font-bold text-white shadow-lg shadow-rose-500/20"
                >
                  💕 AI 궁합 해석 시작하기
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-foreground/60 transition-colors hover:border-rose-500/40 hover:text-rose-400"
      >
        ← 다시 풀이하기
      </motion.button>
    </motion.div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

type PageState = 'form' | 'loading_calc' | 'result' | 'loading_ai';

interface CalcFetcherRes extends GunghapCalcResponse {
  error?: { message: string };
}
interface AiFetcherRes extends GunghapAiResponse {
  error?: { message: string };
  pending?: boolean;
}

export default function GunghapPage() {
  const { savedProfiles, adCreditExpiresAt: initCredit } = useLoaderData<typeof loader>();
  const { user, tokenBalance, setTokenBalance } =
    useOutletContext<DefaultLayoutContext>();

  const [pageState, setPageState] = useState<PageState>('form');
  const [calcResult, setCalcResult] = useState<GunghapCalcResponse | null>(null);
  const [aiResult, setAiResult] = useState<GunghapAiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // pending 폴링 사이클 전체를 추적 (fetcher.state 가 idle 이 돼도 로딩 유지)
  const [isPolling, setIsPolling] = useState(false);

  // 광고 크레딧
  const [adCreditExpiresAt, setAdCreditExpiresAt] = useState<string | null>(initCredit);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const hasCredit =
    adCreditExpiresAt !== null && new Date(adCreditExpiresAt) > new Date();

  const [me, setMe] = useState<FormPerson>(defaultPerson);
  const [partner, setPartner] = useState<FormPerson>(defaultPerson);

  const toPersonInfo = (p: FormPerson): PersonInfo => ({
    name: p.name,
    gender: p.gender as '남' | '여',
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
  });

  // ── calc fetcher ──
  const { fetcher: calcFetcher, isLoading: isCalcLoading } =
    useEasyFetcher<CalcFetcherRes>((res) => {
      if (!res) return;
      if (res.error) {
        setError(res.error.message);
        setPageState('form');
        return;
      }
      const calcRes = res as GunghapCalcResponse;
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
            action: '/api/gunghap-interpret',
            encType: 'application/json',
          });
        }, 0);
      } else {
        setPageState('result');
      }
    });

  // ── AI fetcher ──
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
      // 서버에서 AI 처리 중 — 3초 후 재시도
      if (res.pending) {
        setIsPolling(true);
        setPollTick((t) => t + 1);
        return;
      }
      setIsPolling(false);
      setAiResult(res as GunghapAiResponse);
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
        action: '/api/gunghap-interpret',
        encType: 'application/json',
      });
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollTick]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAiResult(null);
    setPageState('loading_calc');
    calcFetcher.submit(
      JSON.stringify({ me: toPersonInfo(me), partner: toPersonInfo(partner) }),
      { method: 'POST', action: '/api/gunghap', encType: 'application/json' },
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
      action: '/api/gunghap-interpret',
      encType: 'application/json',
    });
  };

  const isFormValid =
    me.gender &&
    me.year &&
    me.month &&
    me.day &&
    partner.gender &&
    partner.year &&
    partner.month &&
    partner.day;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 배경 glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-rose-600/6 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {/* 브레드크럼 */}
        <motion.div
          className="mb-6 flex items-center gap-3"
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
          <span className="text-sm font-semibold text-foreground">💕 궁합 풀이</span>
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
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-sm text-rose-400"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.1,
                  type: 'spring' as const,
                  stiffness: 240,
                  damping: 18,
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  💕
                </motion.span>
                <span>궁합 계산 무료 · AI 해석 {TOKEN_COST_GUNGHAP_AI}결</span>
              </motion.div>
              <h1 className="mb-2 text-2xl font-black text-foreground sm:text-3xl">
                두 사람의 인연을 확인하세요
              </h1>
              <p className="text-sm text-foreground/50">
                사주팔자로 보는 정통 궁합 · AI 심층 해석은 <TokenIcon className="" /> 사용
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 카드 */}
        <motion.div
          className="rounded-3xl bg-gradient-to-br from-rose-600 to-pink-700 p-0.5"
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
              {/* 입력 폼 */}
              {pageState === 'form' && (
                <motion.div
                  key="form-wrapper"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {/* ── 광고 크레딧 게이트 ── */}
                  {!user ? (
                    /* 비로그인 */
                    <div className="py-10 text-center">
                      <p className="mb-2 text-3xl">🔒</p>
                      <p className="mb-1 text-base font-bold text-foreground">
                        로그인이 필요해요
                      </p>
                      <p className="mb-5 text-sm text-foreground/50">
                        궁합 풀이는 로그인 후 광고 시청으로 무료 이용 가능합니다
                      </p>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-3 font-bold text-white shadow-lg"
                      >
                        로그인하러 가기
                      </Link>
                    </div>
                  ) : !hasCredit ? (
                    /* 크레딧 없음 */
                    <div className="py-10 text-center">
                      <motion.p
                        className="mb-2 text-4xl"
                        animate={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        📺
                      </motion.p>
                      <p className="mb-1 text-base font-bold text-foreground">
                        광고 시청 후 무료 이용
                      </p>
                      <p className="mb-5 text-sm text-foreground/50">
                        짧은 광고 한 편을 시청하면{' '}
                        <span className="font-semibold text-rose-400">
                          1시간 동안 무료
                        </span>
                        로 궁합을 확인할 수 있어요
                      </p>
                      <motion.button
                        type="button"
                        onClick={() => setAdModalOpen(true)}
                        whileHover={{
                          scale: 1.04,
                          boxShadow: '0 0 24px rgba(244,63,94,0.4)',
                        }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-7 py-3 font-bold text-white shadow-lg"
                      >
                        <span>📺</span>
                        광고 보고 1시간 무료 이용
                      </motion.button>
                    </div>
                  ) : (
                    /* 크레딧 있음 → 실제 폼 */
                    <motion.form onSubmit={handleSubmit} className="mt-4">
                      {/* 저장된 프로필 빠른 선택 */}
                      {savedProfiles && savedProfiles.length > 0 && (
                        <motion.div
                          className="mb-4 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="mb-2 text-xs font-semibold text-rose-400">
                            📋 저장된 프로필 — 나에게 적용
                          </p>
                          <div className="mb-3 flex flex-wrap gap-2">
                            {savedProfiles.map((p) => (
                              <button
                                key={`me-${p._id}`}
                                type="button"
                                onClick={() =>
                                  setMe({
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
                          <p className="mb-2 text-xs font-semibold text-rose-400">
                            📋 저장된 프로필 — 상대방에게 적용
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {savedProfiles.map((p) => (
                              <button
                                key={`partner-${p._id}`}
                                type="button"
                                onClick={() =>
                                  setPartner({
                                    name: p.name,
                                    gender: p.gender,
                                    year: String(p.year),
                                    month: String(p.month),
                                    day: String(p.day),
                                    hour: p.hour != null ? String(p.hour) : '-1',
                                  })
                                }
                                className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 transition-all hover:border-rose-400/60 hover:bg-rose-500/20"
                              >
                                {p.label} ({p.name})
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <PersonForm
                          label="나"
                          emoji="👤"
                          color="border-violet-500/20 bg-violet-500/5"
                          value={me}
                          onChange={setMe}
                        />
                        <PersonForm
                          label="상대방"
                          emoji="💑"
                          color="border-rose-500/20 bg-rose-500/5"
                          value={partner}
                          onChange={setPartner}
                        />
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isCalcLoading || !isFormValid}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: '0 0 32px rgba(244,63,94,0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-5 w-full rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 py-3.5 font-bold text-white shadow-lg shadow-rose-500/20 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isCalcLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            궁합을 계산하고 있어요...
                          </span>
                        ) : (
                          '💕 궁합 계산하기'
                        )}
                      </motion.button>
                    </motion.form>
                  )}
                </motion.div>
              )}

              {/* 로딩 */}
              {pageState === 'loading_calc' && (
                <LoadingView
                  key="loading-calc"
                  message="두 사람의 운명을 분석하고 있어요..."
                />
              )}

              {/* 결과 */}
              {(pageState === 'result' || pageState === 'loading_ai') && calcResult && (
                <GunghapResult
                  key="result"
                  calcResult={calcResult}
                  tokenBalance={tokenBalance}
                  isLoggedIn={!!user}
                  aiResult={aiResult}
                  isLoadingAi={pageState === 'loading_ai' || isAiLoading || isPolling}
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

        {/* 안내 문구 */}
        <AnimatePresence>
          {pageState === 'form' && (
            <motion.p
              key="notice"
              className="mt-6 text-center text-xs text-foreground/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              ※ 궁합 해석은 참고 목적이며, 중요한 결정의 근거로 삼지 마세요
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 광고 모달 */}
      <AdCreditModal
        open={adModalOpen}
        onClose={() => setAdModalOpen(false)}
        onGranted={(exp) => {
          setAdCreditExpiresAt(exp);
          setAdModalOpen(false);
        }}
      />
    </div>
  );
}
