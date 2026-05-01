import { motion } from 'motion/react';
import { Link } from 'react-router';

const STATS = [
  { num: '1.2M+', label: '누적 사주 분석' },
  { num: '98%', label: '이용자 만족도' },
  { num: '25+', label: '운세 콘텐츠' },
  { num: 'AI', label: '정밀 분석' },
];

const CTA_BUTTONS = [
  {
    to: '/saju',
    label: '🔮 내 사주 보기',
    className:
      'block w-full rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-3.5 text-center font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-violet-500/50 sm:w-auto',
  },
  {
    to: '/tarot',
    label: '🃏 타로 카드 뽑기',
    className:
      'block w-full rounded-full border border-border bg-background/80 px-8 py-3.5 text-center font-semibold text-foreground backdrop-blur-sm transition-all hover:border-foreground/30 hover:bg-secondary sm:w-auto',
  },
  {
    to: '/daily',
    label: '☀️ 오늘의 운세',
    className:
      'block w-full rounded-full border border-amber-500/40 bg-amber-500/10 px-8 py-3.5 text-center font-semibold text-amber-400 transition-all hover:bg-amber-500/20 sm:w-auto',
  },
];

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* 배경 glow — 숨쉬듯 float */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-20 left-10 h-48 w-48 rounded-full bg-purple-500/10 blur-[80px]"
          animate={{ x: [0, 16, 0], y: [0, -12, 0], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-10 right-10 h-64 w-64 rounded-full bg-amber-500/8 blur-[80px]"
          animate={{ x: [0, -12, 0], y: [0, 14, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 text-center md:py-20">
        {/* 뱃지 */}
        <motion.div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-400"
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <motion.span
            animate={{ rotate: [0, 20, -20, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✨
          </motion.span>
          <span>AI가 분석하는 나의 운명</span>
          <motion.span
            animate={{ rotate: [0, -20, 20, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          >
            ✨
          </motion.span>
        </motion.div>

        {/* 타이틀 — 두 줄 순서대로 등장 */}
        <motion.h1
          className="mb-4 text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-6xl"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.span
            className="block"
            variants={{
              hidden: { opacity: 0, y: 28 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            당신의 운명을
          </motion.span>
          <motion.span
            className="block bg-gradient-to-r from-violet-400 via-purple-400 to-amber-400 bg-clip-text text-transparent"
            variants={{
              hidden: { opacity: 0, y: 28 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            Ai가 평가해 드립니다
          </motion.span>
        </motion.h1>

        {/* 서브타이틀 */}
        <motion.p
          className="mx-auto mb-8 max-w-xl px-2 text-sm text-foreground/55 sm:text-base md:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          사주 · 타로 · 궁합 · 운세까지 AI가 수천 년의 지혜를 현대적으로 풀어드립니다
        </motion.p>

        {/* CTA 버튼 */}
        <div className="flex w-full flex-col items-stretch gap-3 px-2 sm:flex-row sm:items-center sm:justify-center sm:px-0">
          {CTA_BUTTONS.map((btn, i) => (
            <motion.div
              key={btn.to}
              className="w-full sm:w-auto"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.55 + i * 0.1,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link to={btn.to} className={btn.className}>
                {btn.label}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* 통계 — stagger */}
        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.8 } },
          }}
        >
          {STATS.map((stat) => (
            <motion.div
              key={stat.label}
              className="text-center"
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
              }}
            >
              <p className="text-2xl font-black text-foreground">{stat.num}</p>
              <p className="text-xs text-foreground/45">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
