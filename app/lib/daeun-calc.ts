import type { DaeunPeriod } from './lifetime-types';
import { CG, CG_HANJA, CG_OHAENG, JJ, JJ_HANJA, JJ_OHAENG } from './saju-calc';

// ─── 절기 근사 날짜 (양력) ─────────────────────────────────
// 소한·입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설
const JEOLGI: Array<{ month: number; day: number }> = [
  { month: 1, day: 6 }, // 소한
  { month: 2, day: 4 }, // 입춘
  { month: 3, day: 6 }, // 경칩
  { month: 4, day: 5 }, // 청명
  { month: 5, day: 6 }, // 입하
  { month: 6, day: 6 }, // 망종
  { month: 7, day: 7 }, // 소서
  { month: 8, day: 8 }, // 입추
  { month: 9, day: 8 }, // 백로
  { month: 10, day: 8 }, // 한로
  { month: 11, day: 7 }, // 입동
  { month: 12, day: 7 }, // 대설
];

function getJeolgiDatesForYear(year: number): Date[] {
  return JEOLGI.map(({ month, day }) => new Date(Date.UTC(year, month - 1, day)));
}

/** 생일 이후 가장 가까운 절기까지의 일수 (순행용) */
function daysToNextJeolgi(birthDate: Date): number {
  const y = birthDate.getUTCFullYear();
  const candidates = [...getJeolgiDatesForYear(y), ...getJeolgiDatesForYear(y + 1)];
  for (const d of candidates) {
    if (d > birthDate) {
      return Math.round((d.getTime() - birthDate.getTime()) / 86_400_000);
    }
  }
  return 0;
}

/** 생일 이전 가장 가까운 절기까지의 일수 (역행용) */
function daysToPrevJeolgi(birthDate: Date): number {
  const y = birthDate.getUTCFullYear();
  const candidates = [...getJeolgiDatesForYear(y - 1), ...getJeolgiDatesForYear(y)];
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (candidates[i] <= birthDate) {
      return Math.round((birthDate.getTime() - candidates[i].getTime()) / 86_400_000);
    }
  }
  return 0;
}

/** 60갑자 인덱스에서 천간·지지 인덱스 추출 */
function find60Idx(cgIdx: number, jjIdx: number): number {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === cgIdx && i % 12 === jjIdx) return i;
  }
  return 0;
}

// ─── 메인 함수 ─────────────────────────────────────────────

export function calcDaeun(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  gender: '남' | '여',
  monthPillarCG: string,
  monthPillarJJ: string,
  currentYear: number,
): {
  daeunStartAge: number;
  direction: '순행' | '역행';
  daeunList: DaeunPeriod[];
} {
  // 1. 년간 음양 (갑·병·무·경·임 = 양)
  const yearIdx60 = (((birthYear - 4) % 60) + 60) % 60;
  const yearCGIdx = yearIdx60 % 10;
  const isYangYear = yearCGIdx % 2 === 0;

  // 2. 방향: 양남/음녀 → 순행, 음남/양녀 → 역행
  const isForward = (gender === '남' && isYangYear) || (gender === '여' && !isYangYear);
  const direction: '순행' | '역행' = isForward ? '순행' : '역행';

  // 3. 대운 시작 나이
  const birthDate = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  const days = isForward ? daysToNextJeolgi(birthDate) : daysToPrevJeolgi(birthDate);
  const daeunStartAge = Math.max(1, Math.round(days / 3));

  // 4. 월주의 60갑자 인덱스
  const monthCGIdx = CG.indexOf(monthPillarCG as (typeof CG)[number]);
  const monthJJIdx = JJ.indexOf(monthPillarJJ as (typeof JJ)[number]);
  const month60Idx = find60Idx(monthCGIdx, monthJJIdx);

  // 5. 대운 리스트 (9개)
  const currentAge = currentYear - birthYear;
  const daeunList: DaeunPeriod[] = [];

  for (let i = 0; i < 9; i++) {
    const startAge = daeunStartAge + i * 10;
    const endAge = startAge + 9;

    const idx60 = isForward
      ? (month60Idx + 1 + i) % 60
      : (((month60Idx - 1 - i) % 60) + 60) % 60;

    const cgIdx = idx60 % 10;
    const jjIdx = idx60 % 12;

    daeunList.push({
      index: i,
      startAge,
      endAge,
      startYear: birthYear + startAge,
      endYear: birthYear + endAge,
      cg: CG[cgIdx],
      jj: JJ[jjIdx],
      cgHanja: CG_HANJA[cgIdx],
      jjHanja: JJ_HANJA[jjIdx],
      cgOhaeng: CG_OHAENG[cgIdx],
      jjOhaeng: JJ_OHAENG[jjIdx],
      isCurrent: currentAge >= startAge && currentAge <= endAge,
    });
  }

  return { daeunStartAge, direction, daeunList };
}
