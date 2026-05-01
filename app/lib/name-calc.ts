import type {
  CharAnalysis,
  NameCalcResponse,
  NameCalcResult,
  NameRequest,
} from './name-types';

// ─── 한글 분리 상수 ────────────────────────────────────────

const HANGUL_BASE = 0xac00;

// 초성 19개: ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ
//               0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18

// 중성 21개: ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ ㅡ ㅢ ㅣ
//               0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20

// ─── 획수 테이블 ──────────────────────────────────────────

/** 초성 획수 (성명학 기준) */
const INITIAL_STROKES = [2, 4, 2, 3, 6, 5, 4, 4, 8, 2, 4, 1, 3, 6, 4, 3, 4, 4, 3];

/** 중성 획수 */
const VOWEL_STROKES = [2, 3, 3, 4, 2, 3, 3, 4, 2, 4, 5, 3, 3, 2, 4, 5, 3, 3, 1, 2, 1];

/**
 * 종성 획수 (index 0 = 받침 없음)
 * 없음 ㄱ ㄲ ㄳ ㄴ ㄵ ㄶ ㄷ ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅁ ㅂ ㅄ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ
 */
const FINAL_STROKES = [
  0, 2, 4, 4, 2, 5, 5, 3, 5, 7, 9, 9, 7, 9, 9, 8, 4, 4, 6, 2, 4, 1, 3, 4, 3, 4, 4, 3,
];

// ─── 오행 테이블 (초성 기준 자음오행) ──────────────────────

type Ohaeng = '목' | '화' | '토' | '금' | '수';

/**
 * 초성 → 오행
 * 목: ㄱ(0) ㄲ(1) ㅋ(15)
 * 화: ㄴ(2) ㄷ(3) ㄸ(4) ㄹ(5) ㅌ(16)
 * 토: ㅇ(11) ㅎ(18)
 * 금: ㅅ(9) ㅆ(10) ㅈ(12) ㅉ(13) ㅊ(14)
 * 수: ㅁ(6) ㅂ(7) ㅃ(8) ㅍ(17)
 */
const INITIAL_OHAENG: Ohaeng[] = [
  '목',
  '목',
  '화',
  '화',
  '화',
  '화',
  '수',
  '수',
  '수',
  '금',
  '금',
  '토',
  '금',
  '금',
  '금',
  '목',
  '화',
  '수',
  '토',
];

// ─── 음양 테이블 (중성 기준) ──────────────────────────────

type YinYang = '양' | '음' | '중';

/**
 * 중성 → 음양
 * 양: ㅏ(0) ㅐ(1) ㅑ(2) ㅒ(3) ㅗ(8) ㅘ(9) ㅙ(10) ㅚ(11) ㅛ(12)
 * 음: ㅓ(4) ㅔ(5) ㅕ(6) ㅖ(7) ㅜ(13) ㅝ(14) ㅞ(15) ㅟ(16) ㅠ(17)
 * 중: ㅡ(18) ㅢ(19) ㅣ(20)
 */
const VOWEL_YIN_YANG: YinYang[] = [
  '양',
  '양',
  '양',
  '양',
  '음',
  '음',
  '음',
  '음',
  '양',
  '양',
  '양',
  '양',
  '양',
  '음',
  '음',
  '음',
  '음',
  '음',
  '중',
  '중',
  '중',
];

// ─── 분해 & 분석 ──────────────────────────────────────────

function decomposeHangul(
  char: string,
): { initial: number; vowel: number; final: number } | null {
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > 0xd7a3) return null;
  const offset = code - HANGUL_BASE;
  return {
    initial: Math.floor(offset / 588),
    vowel: Math.floor((offset % 588) / 28),
    final: offset % 28,
  };
}

function analyzeChar(char: string): CharAnalysis | null {
  const d = decomposeHangul(char);
  if (!d) return null;
  return {
    char,
    strokes: INITIAL_STROKES[d.initial] + VOWEL_STROKES[d.vowel] + FINAL_STROKES[d.final],
    ohaeng: INITIAL_OHAENG[d.initial],
    yinYang: VOWEL_YIN_YANG[d.vowel],
  };
}

// ─── 메인 계산 함수 ────────────────────────────────────────

export function calcName(req: NameRequest): NameCalcResponse {
  const { surname, givenName } = req;

  const surnameChars: CharAnalysis[] = [];
  for (const ch of surname) {
    const a = analyzeChar(ch);
    if (a) surnameChars.push(a);
  }

  const givenNameChars: CharAnalysis[] = [];
  for (const ch of givenName) {
    const a = analyzeChar(ch);
    if (a) givenNameChars.push(a);
  }

  const surnameTotal = surnameChars.reduce((s, c) => s + c.strokes, 0);
  const givenNameTotal = givenNameChars.reduce((s, c) => s + c.strokes, 0);

  // 원격: 이름 글자 획수 합
  const wonGyeok = givenNameTotal;

  // 형격: 이름 끝글자 + 이름 첫글자 (순환 연결). 이름이 1자면 그대로.
  const hyeongGyeok =
    givenNameChars.length >= 2
      ? givenNameChars[givenNameChars.length - 1].strokes + givenNameChars[0].strokes
      : givenNameTotal;

  // 이격: 성 마지막글자 + 이름 첫글자
  const iGyeok =
    (surnameChars[surnameChars.length - 1]?.strokes ?? 0) +
    (givenNameChars[0]?.strokes ?? 0);

  // 정격: 전체 총획
  const jeongGyeok = surnameTotal + givenNameTotal;

  const allChars = [...surnameChars, ...givenNameChars];

  const calc: NameCalcResult = {
    fullName: surname + givenName,
    surnameChars,
    givenNameChars,
    wonGyeok,
    hyeongGyeok,
    iGyeok,
    jeongGyeok,
    ohaengFlow: allChars.map((c) => c.ohaeng),
    yinYangFlow: allChars.map((c) => c.yinYang),
  };

  return { calc, input: req };
}
