// 클라이언트 + 서버 양쪽에서 사용하는 사주 상수
// .server 폴더가 아닌 공유 위치에 위치

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

export type HourOption = (typeof HOUR_OPTIONS)[number];
