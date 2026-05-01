import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  data,
  Link,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
} from 'react-router';

import { GunghapAiCache } from '~/.server/models/gunghap-ai-cache.model';
import { LifetimeAiCache } from '~/.server/models/lifetime-ai-cache.model';
import { NameAiCache } from '~/.server/models/name-ai-cache.model';
import { NewYearAiCache } from '~/.server/models/new-year-ai-cache.model';
import { SajuAiCache } from '~/.server/models/saju-ai-cache.model';
import { getSessionUser } from '~/.server/services/session.service';
import type { GunghapAiInterpretation } from '~/lib/gunghap-types';
import type { LifetimeAiInterpretation } from '~/lib/lifetime-types';
import type { NameAiInterpretation } from '~/lib/name-types';
import type { NewYearAiInterpretation } from '~/lib/new-year-types';
import type { AiInterpretation } from '~/lib/saju-types';

// ─── 타입 ──────────────────────────────────────────────────

interface SajuRecord {
  id: string;
  cacheKey: string;
  interpretation: AiInterpretation;
  model: string;
  createdAt: string;
  expiresAt: string;
}

interface GunghapRecord {
  id: string;
  cacheKey: string;
  interpretation: GunghapAiInterpretation;
  model: string;
  createdAt: string;
  expiresAt: string;
}

interface NameRecord {
  id: string;
  cacheKey: string; // "${surname}|${givenName}|${gender}"
  interpretation: NameAiInterpretation;
  model: string;
  createdAt: string;
  expiresAt: string;
}

interface NewYearRecord {
  id: string;
  targetYear: number;
  cacheKey: string; // "${year}|${month}|${day}|${hour}|${gender}|${targetYear}"
  interpretation: NewYearAiInterpretation;
  model: string;
  createdAt: string;
  expiresAt: string;
}

interface LifetimeRecord {
  id: string;
  cacheKey: string; // "lifetime|${year}|${month}|${day}|${hour}|${gender}"
  input: import('~/lib/lifetime-types').LifetimeRequest;
  interpretation: LifetimeAiInterpretation;
  model: string;
  createdAt: string;
  expiresAt: string;
}

// ─── Loader ────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  if (!user) return redirect('/login');

  const [rawSaju, rawGunghap, rawName, rawNewYear, rawLifetime] = await Promise.all([
    SajuAiCache.find({ userId: user.id, interpretation: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean(),
    GunghapAiCache.find({ userId: user.id, interpretation: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean(),
    NameAiCache.find({ userId: user.id, interpretation: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean(),
    NewYearAiCache.find({ userId: user.id, interpretation: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean(),
    LifetimeAiCache.find({ userId: user.id, interpretation: { $ne: null } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const sajuRecords: SajuRecord[] = rawSaju.map((r) => ({
    id: String(r._id),
    cacheKey: r.cacheKey,
    interpretation: r.interpretation as AiInterpretation,
    model: r.model,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  const gunghapRecords: GunghapRecord[] = rawGunghap.map((r) => ({
    id: String(r._id),
    cacheKey: r.cacheKey,
    interpretation: r.interpretation as GunghapAiInterpretation,
    model: r.model,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  const nameRecords: NameRecord[] = rawName.map((r) => ({
    id: String(r._id),
    cacheKey: r.cacheKey,
    interpretation: r.interpretation as NameAiInterpretation,
    model: r.model,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  const newYearRecords: NewYearRecord[] = rawNewYear.map((r) => ({
    id: String(r._id),
    targetYear: r.targetYear,
    cacheKey: r.cacheKey,
    interpretation: r.interpretation as NewYearAiInterpretation,
    model: r.model,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  const lifetimeRecords: LifetimeRecord[] = rawLifetime.map((r) => ({
    id: String(r._id),
    cacheKey: r.cacheKey,
    input: r.input,
    interpretation: r.interpretation as LifetimeAiInterpretation,
    model: r.model,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));

  return data({
    sajuRecords,
    gunghapRecords,
    nameRecords,
    newYearRecords,
    lifetimeRecords,
  });
};

export const meta: MetaFunction = () => [
  { title: '내 해석 기록 | 운결' },
  { name: 'description', content: 'AI가 분석한 나의 사주와 궁합 기록을 확인하세요' },
];

// ─── 유틸 ──────────────────────────────────────────────────

function parseSajuKey(key: string) {
  const [year, month, day, hour, gender] = key.split('|');
  return { year, month, day, hour: hour === '-1' ? null : hour, gender };
}

function parseNameKey(key: string) {
  const [surname, givenName, gender] = key.split('|');
  return { surname, givenName, gender };
}

function parseGunghapKey(key: string) {
  const [mePart, partnerPart] = key.split('-partner:');
  const meParsed = mePart.replace('me:', '').split('|');
  const partnerParsed = partnerPart.split('|');
  const parse = ([year, month, day, hour, gender]: string[]) => ({
    year,
    month,
    day,
    hour: hour === '-1' ? null : hour,
    gender,
  });
  return { me: parse(meParsed), partner: parse(partnerParsed) };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function timeUntilExpiry(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return '만료됨';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}시간 ${m}분 후 만료`;
  return `${m}분 후 만료`;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ─── 사주 해석 카드 ────────────────────────────────────────

const SAJU_SECTIONS: { key: keyof AiInterpretation; label: string; emoji: string }[] = [
  { key: 'overview', label: '종합 운세', emoji: '🔮' },
  { key: 'personality', label: '성격·성향', emoji: '🌟' },
  { key: 'career', label: '직업·커리어', emoji: '💼' },
  { key: 'love', label: '연애·관계', emoji: '❤️' },
  { key: 'wealth', label: '재물·금전', emoji: '💰' },
  { key: 'health', label: '건강', emoji: '🌿' },
  { key: 'advice', label: '조언', emoji: '💡' },
];

function SajuCard({ record }: { record: SajuRecord }) {
  const [open, setOpen] = useState(false);
  const info = parseSajuKey(record.cacheKey);

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-border bg-secondary/20"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-lg">
            🔮
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {info.gender} · {info.year}년 {info.month}월 {info.day}일
              {info.hour ? ` ${info.hour}시` : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/40">
              {formatDate(record.createdAt)} ·{' '}
              <span className="text-amber-400/80">
                {timeUntilExpiry(record.expiresAt)}
              </span>
            </p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-sm text-foreground/30"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-5 py-4">
              {/* 행운 정보 */}
              <div className="flex flex-wrap gap-2 rounded-xl bg-violet-500/8 px-4 py-3">
                <span className="text-xs text-foreground/50">
                  행운의 색상{' '}
                  <strong className="text-foreground/80">
                    {record.interpretation.luckyColor}
                  </strong>
                </span>
                <span className="text-foreground/20">·</span>
                <span className="text-xs text-foreground/50">
                  행운의 숫자{' '}
                  <strong className="text-foreground/80">
                    {record.interpretation.luckyNumber}
                  </strong>
                </span>
                <span className="text-foreground/20">·</span>
                <span className="text-xs text-foreground/50">
                  행운의 방향{' '}
                  <strong className="text-foreground/80">
                    {record.interpretation.luckyDirection}
                  </strong>
                </span>
              </div>

              {SAJU_SECTIONS.map(({ key, label, emoji }) => (
                <div key={key} className="rounded-xl bg-secondary/30 px-4 py-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-foreground/50">
                    {emoji} {label}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {record.interpretation[key] as string}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 궁합 해석 카드 ────────────────────────────────────────

const GUNGHAP_SECTIONS: {
  key: keyof GunghapAiInterpretation;
  label: string;
  emoji: string;
}[] = [
  { key: 'overall', label: '종합 궁합', emoji: '💫' },
  { key: 'firstImpression', label: '첫인상·끌림', emoji: '👀' },
  { key: 'communication', label: '소통·대화', emoji: '💬' },
  { key: 'romance', label: '연애 스타일', emoji: '❤️' },
  { key: 'marriage', label: '결혼·장기 관계', emoji: '💍' },
  { key: 'challenges', label: '갈등·주의점', emoji: '⚡' },
  { key: 'advice', label: '조언', emoji: '💡' },
];

function GunghapCard({ record }: { record: GunghapRecord }) {
  const [open, setOpen] = useState(false);
  const { me, partner } = parseGunghapKey(record.cacheKey);

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-border bg-secondary/20"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-lg">
            💕
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {me.gender} {me.year}.{me.month}.{me.day}{' '}
              <span className="text-foreground/30">×</span> {partner.gender}{' '}
              {partner.year}.{partner.month}.{partner.day}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/40">
              {formatDate(record.createdAt)} ·{' '}
              <span className="text-amber-400/80">
                {timeUntilExpiry(record.expiresAt)}
              </span>
            </p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-sm text-foreground/30"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-5 py-4">
              {GUNGHAP_SECTIONS.map(({ key, label, emoji }) => (
                <div key={key} className="rounded-xl bg-secondary/30 px-4 py-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-foreground/50">
                    {emoji} {label}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {record.interpretation[key]}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 이름풀이 해석 카드 ────────────────────────────────────

const NAME_SECTIONS: { key: keyof NameAiInterpretation; label: string; emoji: string }[] =
  [
    { key: 'overall', label: '총평', emoji: '📋' },
    { key: 'personality', label: '성격·기질', emoji: '💫' },
    { key: 'fortune', label: '운세 흐름', emoji: '🍀' },
    { key: 'career', label: '직업운', emoji: '💼' },
    { key: 'love', label: '연애·관계', emoji: '💕' },
    { key: 'advice', label: '조언', emoji: '✨' },
  ];

function NameCard({ record }: { record: NameRecord }) {
  const [open, setOpen] = useState(false);
  const { surname, givenName, gender } = parseNameKey(record.cacheKey);

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-border bg-secondary/20"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
            ✍️
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {surname}
              {givenName} · {gender}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/40">
              {formatDate(record.createdAt)} ·{' '}
              <span className="text-amber-400/80">
                {timeUntilExpiry(record.expiresAt)}
              </span>
            </p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-sm text-foreground/30"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-5 py-4">
              {NAME_SECTIONS.map(({ key, label, emoji }) => (
                <div key={key} className="rounded-xl bg-secondary/30 px-4 py-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-foreground/50">
                    {emoji} {label}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {record.interpretation[key]}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 신년운세 해석 카드 ────────────────────────────────────

const NEW_YEAR_SECTIONS: {
  key: keyof Omit<NewYearAiInterpretation, 'monthly'>;
  label: string;
  emoji: string;
}[] = [
  { key: 'overview', label: '총운', emoji: '🌟' },
  { key: 'wealth', label: '재물운', emoji: '💰' },
  { key: 'love', label: '연애·관계운', emoji: '💕' },
  { key: 'career', label: '직업·사업운', emoji: '💼' },
  { key: 'health', label: '건강운', emoji: '🌿' },
  { key: 'advice', label: '올해의 조언', emoji: '✨' },
];

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

function parseLifetimeKey(key: string) {
  // "lifetime|year|month|day|hour|gender"
  const [, year, month, day, hour, gender] = key.split('|');
  return { year, month, day, hour: hour === '-1' ? null : hour, gender };
}

function parseNewYearKey(key: string) {
  const parts = key.split('|');
  return {
    birthYear: parts[0],
    month: parts[1],
    day: parts[2],
    gender: parts[4],
    targetYear: parts[5],
  };
}

function NewYearCard({ record }: { record: NewYearRecord }) {
  const [open, setOpen] = useState(false);
  const { birthYear, month, day, gender } = parseNewYearKey(record.cacheKey);

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-border bg-secondary/20"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-lg">
            🌟
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {record.targetYear}년 신년 운세 · {birthYear}/{month}/{day} · {gender}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/40">
              {formatDate(record.createdAt)} ·{' '}
              <span className="text-amber-400/80">
                {timeUntilExpiry(record.expiresAt)}
              </span>
            </p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-sm text-foreground/30"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-5 py-4">
              {NEW_YEAR_SECTIONS.map(({ key, label, emoji }) => (
                <div key={key} className="rounded-xl bg-secondary/30 px-4 py-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-foreground/50">
                    {emoji} {label}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {record.interpretation[key]}
                  </p>
                </div>
              ))}

              {record.interpretation.monthly?.length === 12 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-foreground/50">
                    📅 월별 운세
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {record.interpretation.monthly.map((text, i) => (
                      <div key={i} className="rounded-xl bg-secondary/30 px-3 py-2.5">
                        <p className="mb-1 text-[10px] font-bold text-violet-400">
                          {MONTH_NAMES[i]}
                        </p>
                        <p className="text-xs leading-relaxed text-foreground/70">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 평생 운세 해석 카드 ───────────────────────────────────

const LIFETIME_SECTIONS: {
  key: keyof Omit<LifetimeAiInterpretation, 'daeunSummaries'>;
  label: string;
  emoji: string;
}[] = [
  { key: 'overview', label: '인생 총운', emoji: '♾️' },
  { key: 'youth', label: '유년·청년기', emoji: '🌱' },
  { key: 'middle', label: '중년기', emoji: '🌿' },
  { key: 'senior', label: '노년기', emoji: '🍂' },
  { key: 'advice', label: '핵심 조언', emoji: '💡' },
];

function LifetimeCard({ record }: { record: LifetimeRecord }) {
  const [open, setOpen] = useState(false);
  const { year, month, day, hour, gender } = parseLifetimeKey(record.cacheKey);
  const { name } = record.input;

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-border bg-secondary/20"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-lg">
            ♾️
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {name} · {gender} · {year}년 {month}월 {day}일{hour ? ` ${hour}시` : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/40">
              {formatDate(record.createdAt)} ·{' '}
              <span className="text-amber-400/80">
                {timeUntilExpiry(record.expiresAt)}
              </span>
            </p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="text-sm text-foreground/30"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border px-5 py-4">
              {LIFETIME_SECTIONS.map(({ key, label, emoji }) => (
                <div key={key} className="rounded-xl bg-secondary/30 px-4 py-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-foreground/50">
                    {emoji} {label}
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {record.interpretation[key]}
                  </p>
                </div>
              ))}

              {record.interpretation.daeunSummaries?.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold text-foreground/50">
                    🔄 대운 흐름
                  </p>
                  <div className="space-y-2">
                    {record.interpretation.daeunSummaries.map((d, i) => (
                      <div key={i} className="rounded-xl bg-secondary/30 px-3 py-2.5">
                        <p className="mb-1 text-[10px] font-bold text-indigo-400">
                          {d.period}
                        </p>
                        <p className="text-xs leading-relaxed text-foreground/70">
                          {d.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────

type Tab = 'saju' | 'gunghap' | 'name' | 'new-year' | 'lifetime';

export default function HistoryPage() {
  const { sajuRecords, gunghapRecords, nameRecords, newYearRecords, lifetimeRecords } =
    useLoaderData<typeof loader>();
  const [tab, setTab] = useState<Tab>('saju');

  const totalCount =
    sajuRecords.length +
    gunghapRecords.length +
    nameRecords.length +
    newYearRecords.length +
    lifetimeRecords.length;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 배경 glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/6 blur-[100px]" />
      </div>

      <div className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        {/* 브레드크럼 */}
        <motion.div
          className="mb-6 flex items-center gap-3"
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
          <span className="text-sm font-semibold text-foreground">📋 내 해석 기록</span>
        </motion.div>

        {/* 헤더 */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <h1 className="mb-1.5 text-2xl font-black text-foreground sm:text-3xl">
            내 해석 기록
          </h1>
          <p className="text-sm text-foreground/50">
            AI가 분석한 결과는 24시간 동안 보관됩니다
            {totalCount > 0 && ` · 총 ${totalCount}건`}
          </p>
        </motion.div>

        {/* 탭 */}
        <motion.div
          className="scrollbar-none mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-secondary/20 p-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
        >
          {(
            [
              { key: 'saju', label: '🔮 사주', count: sajuRecords.length },
              { key: 'gunghap', label: '💕 궁합', count: gunghapRecords.length },
              { key: 'name', label: '✍️ 이름풀이', count: nameRecords.length },
              { key: 'new-year', label: '🌟 신년', count: newYearRecords.length },
              { key: 'lifetime', label: '♾️ 평생', count: lifetimeRecords.length },
            ] as { key: Tab; label: string; count: number }[]
          ).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative flex flex-none items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all sm:flex-1 ${
                tab === key
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    tab === key
                      ? 'bg-white/20 text-white'
                      : 'bg-secondary text-foreground/50'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* 목록 */}
        <AnimatePresence mode="wait">
          {tab === 'saju' && (
            <motion.div
              key="saju"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {sajuRecords.length === 0 ? (
                <EmptyState
                  emoji="🔮"
                  message="아직 사주 해석 기록이 없어요"
                  linkTo="/saju"
                  linkLabel="사주 풀이 받으러 가기"
                />
              ) : (
                <div className="space-y-3">
                  {sajuRecords.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                    >
                      <SajuCard record={r} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'gunghap' && (
            <motion.div
              key="gunghap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {gunghapRecords.length === 0 ? (
                <EmptyState
                  emoji="💕"
                  message="아직 궁합 해석 기록이 없어요"
                  linkTo="/gunghap"
                  linkLabel="궁합 풀이 받으러 가기"
                />
              ) : (
                <div className="space-y-3">
                  {gunghapRecords.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                    >
                      <GunghapCard record={r} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {nameRecords.length === 0 ? (
                <EmptyState
                  emoji="✍️"
                  message="아직 이름풀이 해석 기록이 없어요"
                  linkTo="/name"
                  linkLabel="이름풀이 받으러 가기"
                />
              ) : (
                <div className="space-y-3">
                  {nameRecords.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                    >
                      <NameCard record={r} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'new-year' && (
            <motion.div
              key="new-year"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {newYearRecords.length === 0 ? (
                <EmptyState
                  emoji="🌟"
                  message="아직 신년 운세 해석 기록이 없어요"
                  linkTo="/new-year"
                  linkLabel="신년 운세 받으러 가기"
                />
              ) : (
                <div className="space-y-3">
                  {newYearRecords.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                    >
                      <NewYearCard record={r} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'lifetime' && (
            <motion.div
              key="lifetime"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {lifetimeRecords.length === 0 ? (
                <EmptyState
                  emoji="♾️"
                  message="아직 평생 운세 해석 기록이 없어요"
                  linkTo="/lifetime"
                  linkLabel="평생 운세 받으러 가기"
                />
              ) : (
                <div className="space-y-3">
                  {lifetimeRecords.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: EASE }}
                    >
                      <LifetimeCard record={r} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── 빈 상태 ───────────────────────────────────────────────

function EmptyState({
  emoji,
  message,
  linkTo,
  linkLabel,
}: {
  emoji: string;
  message: string;
  linkTo: string;
  linkLabel: string;
}) {
  return (
    <motion.div
      className="py-16 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <p className="mb-3 text-5xl">{emoji}</p>
      <p className="mb-5 text-sm text-foreground/50">{message}</p>
      <Link
        to={linkTo}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-opacity hover:opacity-90"
      >
        {linkLabel}
      </Link>
    </motion.div>
  );
}
