export type SectionItem = {
  emoji: string;
  title: string;
  desc: string;
  badge: string | null;
  href: string;
  hot: boolean;
};

export type Section = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  badgeColor: string;
  items: SectionItem[];
};

export const SECTIONS: Section[] = [
  {
    id: 'classic',
    title: '정통 사주 & 운세',
    subtitle: '수천 년의 지혜로 당신의 운명을 읽다',
    color: 'from-violet-600 to-purple-800',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    items: [
      {
        emoji: '🔮',
        title: '사주',
        desc: '생년월일시로 보는 정통 사주풀이',
        badge: '인기',
        href: '/saju',
        hot: true,
      },
      {
        emoji: '💑',
        title: '궁합',
        desc: '연애 · 결혼 · 친구 궁합 완전 분석',
        badge: 'NEW',
        href: '/gunghap',
        hot: false,
      },
      {
        emoji: '✍️',
        title: '이름 풀이',
        desc: '이름 점수와 숨겨진 운세 확인',
        badge: null,
        href: '/name',
        hot: false,
      },
      {
        emoji: '🌟',
        title: '신년 운세',
        desc: `${new Date().getFullYear()}년 나의 총운 · 월별 흐름`,
        badge: String(new Date().getFullYear()),
        href: '/new-year',
        hot: true,
      },
      {
        emoji: '♾️',
        title: '평생 운세',
        desc: '인생 전체 흐름과 대운 풀이',
        badge: null,
        href: '/lifetime',
        hot: false,
      },
    ],
  },
  {
    id: 'daily',
    title: '오늘의 운세',
    subtitle: '매일 달라지는 나의 기운을 확인하세요',
    color: 'from-amber-500 to-orange-600',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    items: [
      {
        emoji: '☀️',
        title: '일일 운세',
        desc: '오늘 하루 운세와 주의사항',
        badge: '매일',
        href: '/daily',
        hot: true,
      },
      {
        emoji: '📅',
        title: '주간 운세',
        desc: '이번 주 7일간의 흐름 분석',
        badge: null,
        href: '/weekly',
        hot: false,
      },
      {
        emoji: '🗓️',
        title: '월간 운세',
        desc: '이달의 전체 운세와 길일',
        badge: null,
        href: '/monthly',
        hot: false,
      },
      {
        emoji: '🐉',
        title: '띠별 운세',
        desc: '12띠로 보는 나의 기운',
        badge: null,
        href: '/zodiac-animal',
        hot: false,
      },
      {
        emoji: '⭐',
        title: '별자리 운세',
        desc: '12별자리 오늘의 운세',
        badge: null,
        href: '/horoscope',
        hot: false,
      },
    ],
  },
  {
    id: 'love',
    title: '연애 & 관계',
    subtitle: '그 사람의 마음과 우리의 미래',
    color: 'from-rose-500 to-pink-700',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    items: [
      {
        emoji: '💘',
        title: '썸 궁합',
        desc: '지금 그 사람과 나, 잘 맞을까?',
        badge: '인기',
        href: '/some',
        hot: true,
      },
      {
        emoji: '💔',
        title: '이별 후 재회',
        desc: '헤어진 그 사람과 다시 만날까?',
        badge: null,
        href: '/reunion',
        hot: false,
      },
      {
        emoji: '📱',
        title: '연락 올 확률',
        desc: '오늘 그에게서 연락이 올까?',
        badge: '화제',
        href: '/contact-chance',
        hot: true,
      },
      {
        emoji: '🧠',
        title: '속마음 분석',
        desc: '상대방이 나를 어떻게 생각할까',
        badge: null,
        href: '/mind-read',
        hot: false,
      },
      {
        emoji: '👀',
        title: '바람 여부',
        desc: '상대의 행동, 혹시 수상하지 않나요?',
        badge: '자극',
        href: '/cheating',
        hot: false,
      },
    ],
  },
  {
    id: 'wealth',
    title: '재물 & 사업',
    subtitle: '돈과 성공의 기운이 어디 있는지 확인',
    color: 'from-emerald-500 to-teal-700',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    items: [
      {
        emoji: '💰',
        title: '재물운',
        desc: '오늘의 금전운과 재물 흐름',
        badge: null,
        href: '/wealth',
        hot: false,
      },
      {
        emoji: '📈',
        title: '투자 운세',
        desc: '지금 투자해도 될까? 운세로 확인',
        badge: null,
        href: '/invest',
        hot: false,
      },
      {
        emoji: '🪙',
        title: '코인 운세',
        desc: 'AI가 분석하는 나의 코인 기운',
        badge: 'HOT',
        href: '/coin',
        hot: true,
      },
      {
        emoji: '💼',
        title: '취업 · 이직운',
        desc: '이직 타이밍과 합격 가능성 분석',
        badge: null,
        href: '/career',
        hot: false,
      },
      {
        emoji: '🏢',
        title: '사업운',
        desc: '창업 · 사업 확장의 최적 시기',
        badge: null,
        href: '/business',
        hot: false,
      },
    ],
  },
  {
    id: 'tarot',
    title: '타로 & 특별 콘텐츠',
    subtitle: '직관과 재미로 풀어보는 나의 운명',
    color: 'from-indigo-500 to-blue-700',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    items: [
      {
        emoji: '🃏',
        title: '타로 카드',
        desc: '질문을 담아 카드에게 물어보세요',
        badge: '인기',
        href: '/tarot',
        hot: true,
      },
      {
        emoji: '🎴',
        title: '오늘의 카드',
        desc: '오늘 하루를 위한 카드 1장 뽑기',
        badge: '매일',
        href: '/daily-card',
        hot: true,
      },
      {
        emoji: '🎲',
        title: '랜덤 운세',
        desc: '운명이 골라주는 오늘의 운세',
        badge: null,
        href: '/random',
        hot: false,
      },
      {
        emoji: '🌀',
        title: '전생 테스트',
        desc: '나의 전생은 누구였을까?',
        badge: null,
        href: '/past-life',
        hot: false,
      },
      {
        emoji: '🦋',
        title: '운명 캐릭터',
        desc: '나의 운명을 대표하는 캐릭터는?',
        badge: 'FUN',
        href: '/destiny-char',
        hot: false,
      },
    ],
  },
];

export const QUICK_MENU = [
  { emoji: '☀️', label: '일일운세', href: '/daily' },
  { emoji: '💑', label: '궁합', href: '/gunghap' },
  { emoji: '🐉', label: '띠별운세', href: '/zodiac-animal' },
  { emoji: '⭐', label: '별자리', href: '/horoscope' },
  { emoji: '💘', label: '썸궁합', href: '/some' },
  { emoji: '📱', label: '연락올까?', href: '/contact-chance' },
  { emoji: '🪙', label: '코인운세', href: '/coin' },
  { emoji: '🎴', label: '오늘의카드', href: '/daily-card' },
  { emoji: '🌀', label: '전생테스트', href: '/past-life' },
  { emoji: '💰', label: '재물운', href: '/wealth' },
  { emoji: '💼', label: '취업운', href: '/career' },
];
