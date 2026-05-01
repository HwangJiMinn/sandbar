// ─── 천간 (天干) ──────────────────────────────────────────

export const CG = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const CG_HANJA = [
  '甲',
  '乙',
  '丙',
  '丁',
  '戊',
  '己',
  '庚',
  '辛',
  '壬',
  '癸',
] as const;
export const CG_OHAENG = [
  '목',
  '목',
  '화',
  '화',
  '토',
  '토',
  '금',
  '금',
  '수',
  '수',
] as const;
export const CG_UMYANG = [
  '양',
  '음',
  '양',
  '음',
  '양',
  '음',
  '양',
  '음',
  '양',
  '음',
] as const;

// ─── 지지 (地支) ──────────────────────────────────────────

export const JJ = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
] as const;
export const JJ_HANJA = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const;
export const JJ_OHAENG = [
  '수',
  '토',
  '목',
  '목',
  '토',
  '화',
  '화',
  '토',
  '금',
  '금',
  '토',
  '수',
] as const;
export const JJ_ANIMAL = [
  '쥐',
  '소',
  '호랑이',
  '토끼',
  '용',
  '뱀',
  '말',
  '양',
  '원숭이',
  '닭',
  '개',
  '돼지',
] as const;

// ─── 시간대 라벨 ───────────────────────────────────────────

export const HOUR_OPTIONS = [
  { value: -1, label: '모름', range: '' },
  { value: 23, label: '자시 (子時)', range: '23:00 - 01:00' },
  { value: 1, label: '축시 (丑時)', range: '01:00 - 03:00' },
  { value: 3, label: '인시 (寅時)', range: '03:00 - 05:00' },
  { value: 5, label: '묘시 (卯時)', range: '05:00 - 07:00' },
  { value: 7, label: '진시 (辰時)', range: '07:00 - 09:00' },
  { value: 9, label: '사시 (巳時)', range: '09:00 - 11:00' },
  { value: 11, label: '오시 (午時)', range: '11:00 - 13:00' },
  { value: 13, label: '미시 (未時)', range: '13:00 - 15:00' },
  { value: 15, label: '신시 (申時)', range: '15:00 - 17:00' },
  { value: 17, label: '유시 (酉時)', range: '17:00 - 19:00' },
  { value: 19, label: '술시 (戌時)', range: '19:00 - 21:00' },
  { value: 21, label: '해시 (亥時)', range: '21:00 - 23:00' },
] as const;

// ─── 타입 ─────────────────────────────────────────────────

export interface Pillar {
  cg: string;
  jj: string;
  cgHanja: string;
  jjHanja: string;
  cgOhaeng: string;
  jjOhaeng: string;
  label: string;
}

export interface SajuData {
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar | null;
  ohaengCount: Record<string, number>;
  animal: string;
  ilgan: string; // 일간 (일주 천간) - 나 자신
}

// ─── 헬퍼 ─────────────────────────────────────────────────

function makePillar(cgIdx: number, jjIdx: number, label: string): Pillar {
  return {
    cg: CG[cgIdx],
    jj: JJ[jjIdx],
    cgHanja: CG_HANJA[cgIdx],
    jjHanja: JJ_HANJA[jjIdx],
    cgOhaeng: CG_OHAENG[cgIdx],
    jjOhaeng: JJ_OHAENG[jjIdx],
    label,
  };
}

// ─── 절기 기준 월주 지지 인덱스 ─────────────────────────────
// 근사 절기일 기준 (±1일 오차 허용)
const JEOLGI: Array<[number, number, number]> = [
  // [양력 월, 절기일, 지지 인덱스]
  [1, 6, 1], // 소한 → 축월
  [2, 4, 2], // 입춘 → 인월
  [3, 6, 3], // 경칩 → 묘월
  [4, 5, 4], // 청명 → 진월
  [5, 6, 5], // 입하 → 사월
  [6, 6, 6], // 망종 → 오월
  [7, 7, 7], // 소서 → 미월
  [8, 8, 8], // 입추 → 신월
  [9, 8, 9], // 백로 → 유월
  [10, 8, 10], // 한로 → 술월
  [11, 7, 11], // 입동 → 해월
  [12, 7, 0], // 대설 → 자월
];

function getMonthJJIdx(month: number, day: number): number {
  let jjIdx = 0; // 기본: 자월 (12월 7일 이전)
  for (const [m, d, idx] of JEOLGI) {
    if (month > m || (month === m && day >= d)) {
      jjIdx = idx;
    }
  }
  return jjIdx;
}

// ─── 년주 ─────────────────────────────────────────────────

function calcYearPillar(year: number, month: number, day: number): Pillar {
  // 입춘(2/4) 이전 출생 → 전년도 년주 적용
  const y = month < 2 || (month === 2 && day < 4) ? year - 1 : year;
  const idx60 = (((y - 4) % 60) + 60) % 60;
  return makePillar(idx60 % 10, idx60 % 12, '년주');
}

// ─── 월주 ─────────────────────────────────────────────────

function calcMonthPillar(year: number, month: number, day: number): Pillar {
  const yearCGIdx =
    calcYearPillar(year, month, day).cg === CG[0]
      ? 0
      : CG.indexOf(calcYearPillar(year, month, day).cg as (typeof CG)[number]);

  const jjIdx = getMonthJJIdx(month, day);

  // 월 천간 기준: 갑기년→인월=병(2), 을경→무(4), 병신→경(6), 정임→임(8), 무계→갑(0)
  const cgBases = [2, 4, 6, 8, 0];
  const monthCGBase = cgBases[yearCGIdx % 5];

  // 인월(2)부터 시작하는 순서로 offset 계산
  const JJ_FROM_IN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
  const offset = JJ_FROM_IN.indexOf(jjIdx);

  return makePillar((monthCGBase + offset) % 10, jjIdx, '월주');
}

// ─── 일주 ─────────────────────────────────────────────────

function calcDayPillar(year: number, month: number, day: number): Pillar {
  // 기준: 1900-01-01 = 甲戌일 (육십갑자 10번, 0-indexed)
  // → 2000-01-01은 (10 + 36524) % 60 = 54 (丁巳)
  // 검증: 1997-08-11 = idx 21 = 乙酉(을유) ✓
  //       2000-05-03 = idx 57 = 辛酉(신유) ✓
  const ref = new Date(Date.UTC(2000, 0, 1));
  const target = new Date(Date.UTC(year, month - 1, day));
  const diffDays = Math.round((target.getTime() - ref.getTime()) / 86400000);
  const idx60 = (((54 + diffDays) % 60) + 60) % 60;
  return makePillar(idx60 % 10, idx60 % 12, '일주');
}

// ─── 시주 ─────────────────────────────────────────────────

function calcHourPillar(hour: number, dayCGIdx: number): Pillar {
  // 자시: 23시 또는 0시
  const jjIdx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12;
  // 일간별 자시 천간 기준: 갑기→갑(0), 을경→병(2), 병신→무(4), 정임→경(6), 무계→임(8)
  const cgBases = [0, 2, 4, 6, 8];
  const cgIdx = (cgBases[dayCGIdx % 5] + jjIdx) % 10;
  return makePillar(cgIdx, jjIdx, '시주');
}

// ─── 메인 계산 함수 ────────────────────────────────────────

export function calcSaju(
  year: number,
  month: number,
  day: number,
  hour: number | null, // null = 모름, 정수 = 시각 (0-23)
): SajuData {
  const yearPillar = calcYearPillar(year, month, day);
  const monthPillar = calcMonthPillar(year, month, day);
  const dayPillar = calcDayPillar(year, month, day);
  const dayCGIdx = CG.indexOf(dayPillar.cg as (typeof CG)[number]);
  const hourPillar = hour !== null ? calcHourPillar(hour, dayCGIdx) : null;

  // 오행 카운트
  const ohaengCount: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const pillar of [
    yearPillar,
    monthPillar,
    dayPillar,
    ...(hourPillar ? [hourPillar] : []),
  ]) {
    ohaengCount[pillar.cgOhaeng] = (ohaengCount[pillar.cgOhaeng] ?? 0) + 1;
    ohaengCount[pillar.jjOhaeng] = (ohaengCount[pillar.jjOhaeng] ?? 0) + 1;
  }

  // 띠: 년주 지지
  const animal = JJ_ANIMAL[JJ.indexOf(yearPillar.jj as (typeof JJ)[number])];

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    ohaengCount,
    animal,
    ilgan: dayPillar.cg,
  };
}
