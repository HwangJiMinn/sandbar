import type {
  GunghapCalcResponse,
  GunghapRelation,
  GunghapScores,
  PersonInfo,
} from './gunghap-types';
import { calcSaju, CG, JJ, JJ_ANIMAL, type SajuData } from './saju-calc';

// ─── 오행 관계 맵 ──────────────────────────────────────────

const SAENG: Record<string, string> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
};
const GEUK: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' };

// ─── 천간합 쌍 (갑-기, 을-경, 병-신, 정-임, 무-계) ──────────

const CG_HAP: [number, number, string][] = [
  [0, 5, '합토 (목토 조화)'],
  [1, 6, '합금 (목금 조화)'],
  [2, 7, '합수 (화금 조화)'],
  [3, 8, '합목 (화수 조화)'],
  [4, 9, '합화 (토수 조화)'],
];

// 천간충 쌍 (갑-경, 을-신, 병-임, 정-계)
const CG_CHUNG: [number, number][] = [
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
];

// ─── 지지합·충·원진 ────────────────────────────────────────

// 지지합 (자-축, 인-해, 묘-술, 진-유, 사-신, 오-미)
const JJ_HAP: [number, number, string][] = [
  [0, 1, '자축합 (토)'],
  [2, 11, '인해합 (목)'],
  [3, 10, '묘술합 (화)'],
  [4, 9, '진유합 (금)'],
  [5, 8, '사신합 (수)'],
  [6, 7, '오미합 (토)'],
];

// 삼합 그룹 (인오술=화, 신자진=수, 해묘미=목, 사유축=금)
const SAMHAP: [number[], string][] = [
  [[2, 6, 10], '인오술 삼합 (화국 🔥)'],
  [[8, 0, 4], '신자진 삼합 (수국 💧)'],
  [[11, 3, 7], '해묘미 삼합 (목국 🌿)'],
  [[5, 9, 1], '사유축 삼합 (금국 ⚙️)'],
];

// 지지충 (자-오, 축-미, 인-신, 묘-유, 진-술, 사-해)
const JJ_CHUNG: [number, number][] = [
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
  [4, 10],
  [5, 11],
];

// 원진 (자-미, 축-오, 인-유, 묘-신, 진-해, 사-술)
const WONJIN: [number, number][] = [
  [0, 7],
  [1, 6],
  [2, 9],
  [3, 8],
  [4, 11],
  [5, 10],
];

// ─── 점수 계산 함수들 ──────────────────────────────────────

function isPair(pairs: [number, number][], a: number, b: number): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (y === a && x === b));
}

/** 일간(천간) 관계 점수 0-25 */
function calcIlganScore(a: SajuData, b: SajuData): { score: number; rel: string } {
  const aCGIdx = CG.indexOf(a.dayPillar.cg as (typeof CG)[number]);
  const bCGIdx = CG.indexOf(b.dayPillar.cg as (typeof CG)[number]);
  const aOh = a.dayPillar.cgOhaeng;
  const bOh = b.dayPillar.cgOhaeng;

  // 천간합
  for (const [x, y, desc] of CG_HAP) {
    if ((aCGIdx === x && bCGIdx === y) || (aCGIdx === y && bCGIdx === x)) {
      return { score: 25, rel: `천간합 — ${desc}` };
    }
  }

  // 천간충
  if (isPair(CG_CHUNG, aCGIdx, bCGIdx)) {
    return { score: 5, rel: '천간충 — 서로 부딪히는 기운' };
  }

  // 동일 오행
  if (aOh === bOh) {
    return { score: 16, rel: `동일 오행 (${aOh}) — 비슷한 성향` };
  }

  // 상생
  if (SAENG[aOh] === bOh)
    return { score: 22, rel: `${aOh}→${bOh} 상생 — 좋은 기운의 흐름` };
  if (SAENG[bOh] === aOh)
    return { score: 22, rel: `${bOh}→${aOh} 상생 — 좋은 기운의 흐름` };

  // 상극
  if (GEUK[aOh] === bOh) return { score: 7, rel: `${aOh}→${bOh} 상극 — 긴장 관계` };
  if (GEUK[bOh] === aOh) return { score: 7, rel: `${bOh}→${aOh} 상극 — 긴장 관계` };

  return { score: 13, rel: '중립 관계 — 보통의 인연' };
}

/** 일지(지지) 관계 점수 0-25 */
function calcIljeScore(a: SajuData, b: SajuData): { score: number; rel: string } {
  const aIdx = JJ.indexOf(a.dayPillar.jj as (typeof JJ)[number]);
  const bIdx = JJ.indexOf(b.dayPillar.jj as (typeof JJ)[number]);

  // 지지합
  for (const [x, y, desc] of JJ_HAP) {
    if ((aIdx === x && bIdx === y) || (aIdx === y && bIdx === x)) {
      return { score: 25, rel: `지지합 — ${desc}` };
    }
  }

  // 삼합
  for (const [group, desc] of SAMHAP) {
    if (group.includes(aIdx) && group.includes(bIdx)) {
      return { score: 23, rel: `삼합 — ${desc}` };
    }
  }

  // 지지충
  if (isPair(JJ_CHUNG, aIdx, bIdx)) {
    return { score: 4, rel: '지지충 — 일지가 충돌하는 관계' };
  }

  // 원진
  if (isPair(WONJIN, aIdx, bIdx)) {
    return { score: 6, rel: '원진 — 서로 꺼리는 기운' };
  }

  // 동일 오행
  if (a.dayPillar.jjOhaeng === b.dayPillar.jjOhaeng) {
    return { score: 16, rel: `동일 오행 일지 (${a.dayPillar.jjOhaeng})` };
  }

  return { score: 13, rel: '중립 일지 관계' };
}

/** 오행 조화도 0-25 */
function calcOhaengScore(a: SajuData, b: SajuData): { score: number; desc: string } {
  const combined: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const [k, v] of Object.entries(a.ohaengCount)) combined[k] += v;
  for (const [k, v] of Object.entries(b.ohaengCount)) combined[k] += v;

  const values = Object.values(combined);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // 두 사람 일간 오행 관계
  const aOh = a.dayPillar.cgOhaeng;
  const bOh = b.dayPillar.cgOhaeng;
  let baseScore = 13;
  let desc = `${aOh} & ${bOh} 중립 조화`;

  if (aOh === bOh) {
    baseScore = 15;
    desc = `${aOh} 동일 — 비슷한 기운의 조화`;
  } else if (SAENG[aOh] === bOh) {
    baseScore = 21;
    desc = `${aOh}이 ${bOh}을 키우는 상생`;
  } else if (SAENG[bOh] === aOh) {
    baseScore = 21;
    desc = `${bOh}이 ${aOh}을 키우는 상생`;
  } else if (GEUK[aOh] === bOh || GEUK[bOh] === aOh) {
    baseScore = 7;
    desc = `${aOh} & ${bOh} 상극 — 오행의 긴장`;
  }

  // 균형 보너스: stdDev가 낮을수록 균형
  const balanceBonus = Math.round(Math.max(0, 4 - stdDev));
  const score = Math.min(25, baseScore + balanceBonus);
  return { score, desc };
}

/** 띠 궁합 0-25 */
function calcDdiScore(a: SajuData, b: SajuData): { score: number; desc: string } {
  const aIdx = JJ.indexOf(a.yearPillar.jj as (typeof JJ)[number]);
  const bIdx = JJ.indexOf(b.yearPillar.jj as (typeof JJ)[number]);
  const aAnimal = JJ_ANIMAL[aIdx];
  const bAnimal = JJ_ANIMAL[bIdx];

  // 삼합
  for (const [group, gDesc] of SAMHAP) {
    if (group.includes(aIdx) && group.includes(bIdx)) {
      return { score: 25, desc: `${aAnimal}띠 & ${bAnimal}띠 — ${gDesc}` };
    }
  }

  // 지지합 (육합)
  for (const [x, y, hDesc] of JJ_HAP) {
    if ((aIdx === x && bIdx === y) || (aIdx === y && bIdx === x)) {
      return { score: 22, desc: `${aAnimal}띠 & ${bAnimal}띠 — 육합 (${hDesc})` };
    }
  }

  // 원진
  if (isPair(WONJIN, aIdx, bIdx)) {
    return { score: 5, desc: `${aAnimal}띠 & ${bAnimal}띠 — 원진 (서로 꺼리는 관계)` };
  }

  // 지지충
  if (isPair(JJ_CHUNG, aIdx, bIdx)) {
    return { score: 3, desc: `${aAnimal}띠 & ${bAnimal}띠 — 충 (대립하는 관계)` };
  }

  // 동일 띠
  if (aIdx === bIdx) {
    return { score: 18, desc: `${aAnimal}띠 동갑 — 비슷한 운명의 흐름` };
  }

  return { score: 14, desc: `${aAnimal}띠 & ${bAnimal}띠 — 보통의 인연` };
}

// ─── 레벨 판정 ─────────────────────────────────────────────

function getLevel(total: number): { level: string; emoji: string } {
  if (total >= 90) return { level: '천생연분', emoji: '💫' };
  if (total >= 80) return { level: '최고의 궁합', emoji: '💕' };
  if (total >= 70) return { level: '좋은 궁합', emoji: '💝' };
  if (total >= 60) return { level: '평범한 궁합', emoji: '🌸' };
  if (total >= 50) return { level: '노력이 필요한 궁합', emoji: '🌱' };
  if (total >= 40) return { level: '어려운 궁합', emoji: '⚡' };
  return { level: '조심스러운 궁합', emoji: '🌊' };
}

// ─── 메인 계산 함수 ────────────────────────────────────────

export function calcGunghap(me: PersonInfo, partner: PersonInfo): GunghapCalcResponse {
  const meSaju = calcSaju(me.year, me.month, me.day, me.hour);
  const partnerSaju = calcSaju(partner.year, partner.month, partner.day, partner.hour);

  const ilgan = calcIlganScore(meSaju, partnerSaju);
  const ilje = calcIljeScore(meSaju, partnerSaju);
  const ohaeng = calcOhaengScore(meSaju, partnerSaju);
  const ddi = calcDdiScore(meSaju, partnerSaju);

  const total = ilgan.score + ilje.score + ohaeng.score + ddi.score;
  const { level, emoji } = getLevel(total);

  const scores: GunghapScores = {
    ilgan: ilgan.score,
    ilje: ilje.score,
    ohaeng: ohaeng.score,
    ddi: ddi.score,
    total,
  };

  const relation: GunghapRelation = {
    ilganRel: ilgan.rel,
    iljeRel: ilje.rel,
    ohaengDesc: ohaeng.desc,
    ddiDesc: ddi.desc,
  };

  return {
    me: { saju: meSaju, input: me },
    partner: { saju: partnerSaju, input: partner },
    scores,
    relation,
    level,
    levelEmoji: emoji,
  };
}
