import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
} from 'react-router';
import { Link } from 'react-router';

import { SavedSaju } from '~/.server/models/saved-saju.model';
import { getSessionUser } from '~/.server/services/session.service';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import { HOUR_OPTIONS } from '~/lib/saju-calc';
import type {
  ProfileCreateResponse,
  ProfileDeleteResponse,
  SavedSajuProfile,
} from '~/lib/saved-saju-types';

// ─── Loader ────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  if (!user) return redirect('/login');

  const raw = await SavedSaju.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  const profiles: SavedSajuProfile[] = raw.map((p) => ({
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

  return data({ user, profiles });
};

export const meta: MetaFunction = () => [
  { title: '내 정보 | 운결' },
  { name: 'description', content: '나의 사주 정보를 저장하고 관리하세요' },
];

// ─── 상수 ─────────────────────────────────────────────────

const YEARS = Array.from({ length: 100 }, (_, i) => 2010 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const stagger = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

// ─── 빈 폼 초기값 ─────────────────────────────────────────

const EMPTY_FORM = {
  label: '',
  name: '',
  gender: '남' as '남' | '여',
  year: 1990,
  month: 1,
  day: 1,
  hour: null as number | null,
};

// ─── 자주 사용하는 별칭 태그 ────────────────────────────────

const LABEL_PRESETS = [
  { text: '나', emoji: '👤' },
  { text: '엄마', emoji: '👩' },
  { text: '아빠', emoji: '👨' },
  { text: '남자친구', emoji: '💑' },
  { text: '여자친구', emoji: '💑' },
  { text: '남편', emoji: '💍' },
  { text: '아내', emoji: '💍' },
  { text: '형', emoji: '🧑' },
  { text: '오빠', emoji: '🧑' },
  { text: '언니', emoji: '👧' },
  { text: '누나', emoji: '👧' },
  { text: '친구', emoji: '🤝' },
] as const;

// ─── 프로필 카드 ───────────────────────────────────────────

function ProfileCard({
  profile,
  onDelete,
}: {
  profile: SavedSajuProfile;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const hourOption =
    profile.hour != null ? HOUR_OPTIONS.find((o) => o.value === profile.hour) : null;
  const hourLabel = hourOption ? hourOption.label.split(' ')[0] : '시간 미상';
  const hourRange = hourOption?.range ?? '';

  return (
    <motion.div
      layout
      variants={fadeUp}
      initial="hidden"
      animate="show"
      exit="exit"
      className="relative rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
    >
      {/* 배지 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-3 py-0.5 text-xs font-semibold text-violet-300">
          {profile.label}
        </span>
        <span
          className={`text-xs ${profile.gender === '남' ? 'text-blue-400' : 'text-rose-400'}`}
        >
          {profile.gender === '남' ? '♂ 남성' : '♀ 여성'}
        </span>
      </div>

      <p className="mb-1 text-lg font-bold text-white">{profile.name}</p>
      <p className="text-sm text-white/60">
        {profile.year}년 {profile.month}월 {profile.day}일
      </p>
      <p className="mt-0.5 text-xs text-white/40">
        {hourLabel}
        {hourRange && <span className="ml-1 text-white/30">({hourRange})</span>}
      </p>

      {/* 삭제 버튼 */}
      <div className="mt-4 flex justify-end gap-2">
        {confirming ? (
          <>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-white/50 transition-colors hover:text-white/80"
            >
              취소
            </button>
            <button
              onClick={() => onDelete(profile._id)}
              className="rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/30"
            >
              삭제 확인
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-rose-400"
          >
            삭제
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── 추가 폼 ──────────────────────────────────────────────

function AddProfileForm({
  onAdd,
  loading,
}: {
  onAdd: (form: typeof EMPTY_FORM) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  // 별칭: 'preset' = 태그 선택 모드, 'custom' = 직접 입력 모드
  const [labelMode, setLabelMode] = useState<'preset' | 'custom'>('preset');

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePresetClick(text: string) {
    set('label', text);
  }

  function handleLabelModeSwitch(mode: 'preset' | 'custom') {
    setLabelMode(mode);
    if (mode === 'preset') set('label', '');
    if (mode === 'custom') set('label', '');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !form.name.trim()) return;
    onAdd(form);
    setForm({ ...EMPTY_FORM });
    setLabelMode('preset');
  }

  const selectCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none transition-colors';
  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-violet-500 focus:outline-none transition-colors';
  const labelCls = 'mb-1.5 block text-xs font-medium text-white/60';

  // 시간 옵션에서 '모름'(value=-1) 제외한 나머지
  const hourChoices = HOUR_OPTIONS.filter((o) => o.value !== -1);

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-2xl border border-violet-500/20 bg-violet-950/30 p-5 sm:p-6"
    >
      <h3 className="mb-5 text-base font-bold text-white">새 프로필 추가</h3>

      {/* ── 별칭 ── */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <label className={labelCls + ' mb-0'} htmlFor="별칭">
            별칭 *
          </label>
          {/* 모드 전환 탭 */}
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleLabelModeSwitch('preset')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                labelMode === 'preset'
                  ? 'bg-violet-600 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              태그 선택
            </button>
            <button
              type="button"
              onClick={() => handleLabelModeSwitch('custom')}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                labelMode === 'custom'
                  ? 'bg-violet-600 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              직접 입력
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {labelMode === 'preset' ? (
            <motion.div
              key="preset"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-wrap gap-2">
                {LABEL_PRESETS.map((p) => (
                  <button
                    key={p.text}
                    type="button"
                    onClick={() => handlePresetClick(p.text)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      form.label === p.text
                        ? 'border-violet-400 bg-violet-500/30 text-violet-200 shadow-sm shadow-violet-500/20'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-white/90'
                    }`}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.text}</span>
                  </button>
                ))}
              </div>
              {form.label && (
                <p className="mt-2 text-xs text-violet-400">
                  선택됨: <strong>{form.label}</strong>
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <input
                type="text"
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                placeholder="별칭을 직접 입력하세요 (예: 짝사랑, 동생)"
                maxLength={20}
                className={inputCls}
              />
              <p className="mt-1.5 text-right text-xs text-white/30">
                {form.label.length}/20
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 이름 */}
        <div className="sm:col-span-2">
          <label htmlFor="profile-name" className={labelCls}>
            이름 *
          </label>
          <input
            id="profile-name"
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="홍길동"
            maxLength={20}
            required
            className={inputCls}
          />
        </div>

        {/* 성별 */}
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="gender">
            성별 *
          </label>
          <div className="flex gap-3">
            {(['남', '여'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set('gender', g)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-all ${
                  form.gender === g
                    ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                    : 'border-white/10 bg-white/5 text-white/50 hover:border-violet-500/40 hover:text-white/80'
                }`}
              >
                {g === '남' ? '👨 남성' : '👩 여성'}
              </button>
            ))}
          </div>
        </div>

        {/* 생년 · 월 · 일 — 한 줄 */}
        <div className="sm:col-span-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="profile-year" className={labelCls}>
                태어난 해 *
              </label>
              <select
                id="profile-year"
                value={form.year}
                onChange={(e) => set('year', Number(e.target.value))}
                className={selectCls}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-month" className={labelCls}>
                태어난 달 *
              </label>
              <select
                id="profile-month"
                value={form.month}
                onChange={(e) => set('month', Number(e.target.value))}
                className={selectCls}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-day" className={labelCls}>
                태어난 날 *
              </label>
              <select
                id="profile-day"
                value={form.day}
                onChange={(e) => set('day', Number(e.target.value))}
                className={selectCls}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 시간 — 카드 그리드 */}
        <div className="sm:col-span-2">
          <p className={labelCls}>태어난 시간 (선택)</p>
          <p className="mb-3 text-xs text-white/40">모르는 경우 선택하지 않아도 됩니다</p>
          {/* 모름 버튼 */}
          <button
            type="button"
            onClick={() => set('hour', null)}
            className={`mb-2 w-full rounded-xl border py-2.5 text-sm font-semibold transition-all ${
              form.hour === null
                ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/70'
            }`}
          >
            ❓ 모름
          </button>
          {/* 시간 카드 그리드 */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {hourChoices.map((o) => {
              const isSelected = form.hour === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set('hour', o.value)}
                  className={`flex flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-all ${
                    isSelected
                      ? 'border-violet-400 bg-violet-500/25 text-white shadow-sm shadow-violet-500/20'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white/90'
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${isSelected ? 'text-violet-300' : ''}`}
                  >
                    {o.label.split(' ')[0]}
                  </span>
                  <span className="mt-0.5 text-[10px] text-white/40">{o.range}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !form.label.trim() || !form.name.trim()}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white shadow-lg transition-all hover:from-violet-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            저장 중…
          </span>
        ) : (
          '✨ 프로필 저장'
        )}
      </button>
    </motion.form>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

export default function ProfilePage() {
  const { user, profiles: initialProfiles } = useLoaderData<typeof loader>();
  const [profiles, setProfiles] = useState<SavedSajuProfile[]>(initialProfiles);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const { fetcher: createFetcher, isLoading: isCreating } =
    useEasyFetcher<ProfileCreateResponse>((res) => {
      if (res?.profile) {
        setProfiles((prev) => [res.profile, ...prev]);
        showToast('프로필이 저장되었습니다! 🎉');
      }
    });

  const { fetcher: deleteFetcher } = useEasyFetcher<ProfileDeleteResponse>((res) => {
    if (res?.success) {
      showToast('프로필을 삭제했습니다.');
    }
  });

  function handleAdd(form: typeof EMPTY_FORM) {
    createFetcher.submit(JSON.stringify(form), {
      method: 'POST',
      action: '/api/profile',
      encType: 'application/json',
    });
  }

  function handleDelete(id: string) {
    setProfiles((prev) => prev.filter((p) => p._id !== id));
    deleteFetcher.submit(JSON.stringify({ id }), {
      method: 'DELETE',
      action: '/api/profile',
      encType: 'application/json',
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 px-4 pt-8 pb-20 sm:pt-12">
      <div className="mx-auto max-w-2xl">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-8"
        >
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
          >
            ← 홈으로
          </Link>
          <h1 className="text-2xl font-black text-white sm:text-3xl">👤 내 정보</h1>
          <p className="mt-1 text-sm text-white/50">
            {user.name}님의 사주 프로필을 저장하고 관리하세요
          </p>
        </motion.div>

        {/* 프로필 목록 */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={stagger}
          className="mb-8"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/70">
              저장된 프로필 ({profiles.length}/10)
            </h2>
          </div>

          {profiles.length === 0 ? (
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-white/30"
            >
              <p className="mb-3 text-4xl">🔮</p>
              <p className="text-sm">아직 저장된 프로필이 없습니다</p>
              <p className="mt-1 text-xs">아래 양식으로 첫 번째 프로필을 추가해보세요</p>
            </motion.div>
          ) : (
            <motion.div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {profiles.map((p) => (
                  <ProfileCard key={p._id} profile={p} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.section>

        {/* 추가 폼 */}
        {profiles.length < 10 && (
          <AddProfileForm onAdd={handleAdd} loading={isCreating} />
        )}

        {profiles.length >= 10 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-xs text-white/40"
          >
            최대 10개의 프로필을 저장할 수 있습니다. 일부를 삭제 후 추가하세요.
          </motion.p>
        )}

        {/* 바로가기 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
          className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Link
            to="/saju"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-violet-500/40 hover:bg-violet-500/10"
          >
            <span className="text-2xl">🔮</span>
            <div>
              <p className="font-semibold text-white">사주 풀이</p>
              <p className="text-xs text-white/50">저장된 프로필로 바로 분석</p>
            </div>
          </Link>
          <Link
            to="/gunghap"
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-rose-500/40 hover:bg-rose-500/10"
          >
            <span className="text-2xl">💑</span>
            <div>
              <p className="font-semibold text-white">궁합 보기</p>
              <p className="text-xs text-white/50">저장된 프로필로 바로 분석</p>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
