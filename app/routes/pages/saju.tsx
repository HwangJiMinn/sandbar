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
import { TokenIcon } from '~/components/ui/token-icon';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import { HOUR_OPTIONS } from '~/lib/saju-calc';
import type {
  AiInterpretation,
  SajuAiResponse,
  SajuCalcResponse,
} from '~/lib/saju-types';
import type { SavedSajuProfile } from '~/lib/saved-saju-types';
import { TOKEN_COST_SAJU_AI } from '~/lib/token-constants';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

// ─── Loader ────────────────────────────────────────────────

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

export const meta: MetaFunction = () => [
  { title: '사주 풀이 | 운결' },
  { name: 'description', content: '생년월일시로 보는 정통 AI 사주풀이' },
];

// ─── 상수 ─────────────────────────────────────────────────

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

const AI_SECTIONS = [
  {
    key: 'overview',
    label: '✨ 총운 & 타고난 운명',
    color: 'from-violet-600 to-purple-700',
  },
  { key: 'personality', label: '🧠 성격 & 기질', color: 'from-indigo-500 to-blue-600' },
  { key: 'career', label: '💼 직업운 & 재능', color: 'from-teal-500 to-emerald-600' },
  { key: 'love', label: '💘 연애운 & 결혼운', color: 'from-rose-500 to-pink-600' },
  { key: 'wealth', label: '💰 재물운 & 금전운', color: 'from-amber-500 to-orange-600' },
  { key: 'health', label: '🌿 건강운', color: 'from-green-500 to-teal-600' },
  { key: 'advice', label: '🔮 총평 & 인생 조언', color: 'from-purple-500 to-violet-700' },
] as const;

const YEARS = Array.from({ length: 100 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// ─── 애니메이션 variants ───────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25, ease: 'easeIn' as const } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemFade = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const scalePop = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 },
  },
};

// ─── PillarCard ────────────────────────────────────────────

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
      className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center backdrop-blur-sm"
    >
      <span className="mb-1 text-xs font-semibold text-white/40">{label}</span>
      <div className="flex flex-col items-center">
        <span className="text-2xl font-black text-white">{cgHanja}</span>
        <span className="text-sm text-white/70">{cg}</span>
        <span className={`mt-0.5 text-[10px] font-semibold ${OHAENG_TEXT[cgOhaeng]}`}>
          {OHAENG_EMOJI[cgOhaeng]} {cgOhaeng}
        </span>
      </div>
      <div className="my-2 h-px w-full bg-white/10" />
      <div className="flex flex-col items-center">
        <span className="text-2xl font-black text-white">{jjHanja}</span>
        <span className="text-sm text-white/70">{jj}</span>
        <span className={`mt-0.5 text-[10px] font-semibold ${OHAENG_TEXT[jjOhaeng]}`}>
          {OHAENG_EMOJI[jjOhaeng]} {jjOhaeng}
        </span>
      </div>
    </motion.div>
  );
}

// ─── OhaengBar ────────────────────────────────────────────

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

// ─── 입력 폼 ───────────────────────────────────────────────

interface FormState {
  name: string;
  gender: '남' | '여' | '';
  year: string;
  month: string;
  day: string;
  hour: string;
}

function SajuForm({
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
          htmlFor="saju-name"
          className="mb-1.5 block text-sm font-medium text-foreground/70"
        >
          이름 <span className="text-foreground/30">(선택)</span>
        </label>
        <input
          id="saju-name"
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
            '⬛ 사주팔자 계산하기 (무료)'
          )}
        </motion.button>
      </motion.div>
    </motion.form>
  );
}

// ─── 로딩 뷰 ──────────────────────────────────────────────

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
          🔮
        </motion.span>
      </motion.div>
      <motion.p
        className="text-lg font-semibold text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>
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

// ─── 사주팔자 결과 (AI 전) ─────────────────────────────────

interface SajuResultProps {
  calcResult: SajuCalcResponse;
  tokenBalance: number | null;
  isLoggedIn: boolean;
  aiResult: SajuAiResponse | null;
  isLoadingAi: boolean;
  onRequestAi: () => void;
  onReset: () => void;
}

function SajuResult({
  calcResult,
  tokenBalance,
  isLoggedIn,
  aiResult,
  isLoadingAi,
  onRequestAi,
  onReset,
}: SajuResultProps) {
  const { saju, input } = calcResult;
  const { yearPillar: yp, monthPillar: mp, dayPillar: dp, hourPillar: hp } = saju;
  const hasEnoughTokens = tokenBalance != null && tokenBalance >= TOKEN_COST_SAJU_AI;

  return (
    <motion.div
      key="saju-result"
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-8"
    >
      {/* 프로필 헤더 */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-900/40 to-purple-900/30 p-6 text-center"
      >
        <motion.p
          className="mb-1 text-3xl"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring' as const,
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
        >
          {saju.animal}띠
        </motion.p>
        <motion.h2
          className="text-xl font-black text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {input.name ? `${input.name}님의 사주` : '사주 풀이 결과'}
        </motion.h2>
        <motion.p
          className="mt-1 text-sm text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {input.year}년 {input.month}월 {input.day}일
          {input.hour !== null
            ? ` · ${HOUR_OPTIONS.find((h) => h.value === input.hour)?.label}`
            : ''}
          {' · '}
          {input.gender}자
        </motion.p>
        <motion.p
          className="mt-2 text-sm text-violet-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          일간(日干):{' '}
          <strong>
            {dp.cg}({dp.cgHanja})
          </strong>{' '}
          · {dp.cgOhaeng}의 기운
        </motion.p>
      </motion.div>

      {/* 사주팔자 차트 */}
      <motion.div variants={fadeUp} transition={{ delay: 0.1 }}>
        <h3 className="mb-3 text-sm font-semibold text-foreground/50">
          ⬛ 사주 팔자 (四柱八字)
        </h3>
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

      {/* 오행 분석 */}
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
          /* AI 결과 표시 */
          <motion.div
            key="ai-done"
            className="space-y-4"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemFade} className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground/50">
                🤖 AI 사주 해석
              </h3>
            </motion.div>
            {AI_SECTIONS.map(({ key, label, color }) => {
              const text = aiResult.ai[key as keyof AiInterpretation];
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
            })}

            {/* 행운 정보 */}
            <motion.div className="grid grid-cols-3 gap-2 sm:gap-3" variants={stagger}>
              {[
                { label: '행운의 색', value: aiResult.ai.luckyColor, emoji: '🎨' },
                {
                  label: '행운의 숫자',
                  value: String(aiResult.ai.luckyNumber),
                  emoji: '🔢',
                },
                { label: '행운의 방향', value: aiResult.ai.luckyDirection, emoji: '🧭' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  variants={scalePop}
                  whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
                  className="rounded-2xl border border-border bg-secondary/30 p-4 text-center"
                >
                  <p className="mb-1 text-xl">{item.emoji}</p>
                  <p className="text-xs text-foreground/40">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{item.value}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              className="text-center text-xs text-foreground/30"
              variants={itemFade}
            >
              {aiResult.remainingTokens === -1
                ? '오늘 이미 받은 해석 결과예요'
                : `이번 해석에 ${TOKEN_COST_SAJU_AI}결이 사용되었습니다 · 잔액: ${aiResult.remainingTokens.toLocaleString()}결`}
            </motion.p>
          </motion.div>
        ) : isLoadingAi ? (
          <LoadingView key="ai-loading" message="AI가 운명의 흐름을 읽고 있어요..." />
        ) : (
          /* AI 요청 전 — CTA 박스 */
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
              <h3 className="mb-1 text-base font-bold text-foreground">AI 사주 해석</h3>
              <p className="mb-4 text-sm text-foreground/55">
                30년 경력 사주 전문가 수준의 AI가 당신의 사주를 깊이 있게 분석합니다
              </p>

              {/* 토큰 비용 표시 */}
              <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 py-2.5">
                <span className="text-amber-400">⚡</span>
                <span className="text-sm font-semibold text-amber-300">
                  {TOKEN_COST_SAJU_AI}결 사용
                </span>
                {isLoggedIn && tokenBalance != null && (
                  <span className="text-xs text-foreground/40">
                    (잔액: {tokenBalance.toLocaleString()}
                    결)
                  </span>
                )}
              </div>

              {/* 상태별 버튼 */}
              {!isLoggedIn ? (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white"
                  >
                    로그인하고 AI 해석 받기
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
                    토큰이 부족합니다. {TOKEN_COST_SAJU_AI}결 이상 필요해요.
                  </p>
                </div>
              ) : (
                <motion.button
                  onClick={onRequestAi}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(139,92,246,0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white shadow-lg shadow-violet-500/20"
                >
                  🔮 AI 사주 해석 시작하기
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
        transition={{ delay: 0.6 }}
        className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-foreground/60 transition-colors hover:border-violet-500/40 hover:text-violet-400"
      >
        ← 다시 풀이하기
      </motion.button>
    </motion.div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

type PageState = 'form' | 'loading_calc' | 'saju' | 'loading_ai';

interface CalcFetcherRes extends SajuCalcResponse {
  error?: { message: string };
}
interface AiFetcherRes extends SajuAiResponse {
  error?: { message: string };
  pending?: boolean;
}

export default function SajuPage() {
  const { savedProfiles } = useLoaderData<typeof loader>();
  const { user, tokenBalance, setTokenBalance } =
    useOutletContext<DefaultLayoutContext>();

  const [pageState, setPageState] = useState<PageState>('form');
  const [calcResult, setCalcResult] = useState<SajuCalcResponse | null>(null);
  const [aiResult, setAiResult] = useState<SajuAiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0); // 프로필 선택 시 폼 리셋용
  const [selectedInitial, setSelectedInitial] = useState<Partial<FormState> | undefined>(
    undefined,
  );

  // pending 폴링 사이클 전체를 추적 (fetcher.state 가 idle 이 돼도 로딩 유지)
  const [isPolling, setIsPolling] = useState(false);

  // ── 사주 계산 fetcher ──
  const { fetcher: calcFetcher, isLoading: isCalcLoading } =
    useEasyFetcher<CalcFetcherRes>((res) => {
      if (!res) return;
      if (res.error) {
        setError(res.error.message);
        setPageState('form');
        return;
      }
      const calcRes = res as SajuCalcResponse;
      setCalcResult(calcRes);

      const { aiCache } = calcRes;
      if (aiCache && 'ai' in aiCache) {
        // 완료된 캐시 → 바로 표시
        setAiResult({ ai: aiCache.ai, model: aiCache.model, remainingTokens: -1 });
        setPageState('saju');
      } else if (aiCache && 'pending' in aiCache) {
        // 처리 중인 캐시 → 자동 폴링 시작
        setIsPolling(true);
        setPageState('loading_ai');
        const params = JSON.stringify({ input: calcRes.input, saju: calcRes.saju });
        setPendingAiParams(params);
        setTimeout(() => {
          aiFetcher.submit(params, {
            method: 'POST',
            action: '/api/saju-interpret',
            encType: 'application/json',
          });
        }, 0);
      } else {
        setPageState('saju');
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
        setPageState('saju');
        return;
      }
      // 서버에서 AI 처리 중 — 3초 후 재시도
      if (res.pending) {
        setIsPolling(true);
        setPollTick((t) => t + 1);
        return;
      }
      setIsPolling(false);
      setAiResult(res as SajuAiResponse);
      // -1이면 캐시 응답 (토큰 차감 없음) → 잔액 유지
      if (res.remainingTokens !== -1) setTokenBalance(res.remainingTokens);
      setPageState('saju');
    },
  );

  // pending 응답 시 3초 후 재시도
  useEffect(() => {
    if (pollTick === 0 || !pendingAiParams) return;
    const t = setTimeout(() => {
      aiFetcher.submit(pendingAiParams, {
        method: 'POST',
        action: '/api/saju-interpret',
        encType: 'application/json',
      });
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollTick]);

  const handleCalcSubmit = (form: {
    name: string;
    gender: string;
    year: string;
    month: string;
    day: string;
    hour: string;
  }) => {
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
      { method: 'POST', action: '/api/saju', encType: 'application/json' },
    );
  };

  const handleRequestAi = () => {
    if (!calcResult) return;
    setError(null);
    setIsPolling(true);
    setPageState('loading_ai');
    const params = JSON.stringify({ input: calcResult.input, saju: calcResult.saju });
    setPendingAiParams(params);
    aiFetcher.submit(params, {
      method: 'POST',
      action: '/api/saju-interpret',
      encType: 'application/json',
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-12">
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
          <span className="text-sm font-semibold text-foreground">🔮 사주 풀이</span>
        </motion.div>

        <AnimatePresence>
          {pageState === 'form' && (
            <motion.div
              key="hero"
              className="mb-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <motion.div
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400"
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
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ✨
                </motion.span>
                <span>
                  사주팔자 무료 · AI 해석 100
                  <TokenIcon className="" />
                </span>
              </motion.div>
              <h1 className="mb-2 text-2xl font-black text-foreground sm:text-3xl">
                당신의 사주를 풀어드립니다
              </h1>
              <p className="text-sm text-foreground/50">
                사주팔자는 무료로 즉시 확인 · AI 심층 해석은 <TokenIcon className="" />{' '}
                사용
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-0.5"
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.15 }}
        >
          <div className="rounded-[calc(1.5rem-2px)] bg-background/95 p-6 md:p-8">
            <AnimatePresence mode="wait">
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
              {pageState === 'form' && (
                <motion.div
                  key="form"
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  {/* 저장된 프로필 선택 */}
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
                  <SajuForm
                    key={formKey}
                    onSubmit={handleCalcSubmit}
                    isLoading={isCalcLoading}
                    initialValues={selectedInitial}
                  />
                </motion.div>
              )}
              {pageState === 'loading_calc' && (
                <LoadingView key="loading-calc" message="사주팔자를 계산하고 있어요..." />
              )}
              {(pageState === 'saju' || pageState === 'loading_ai') && calcResult && (
                <SajuResult
                  key="saju-result"
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
              ※ 사주 해석은 참고 목적이며, 중요한 결정의 근거로 삼지 마세요
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
