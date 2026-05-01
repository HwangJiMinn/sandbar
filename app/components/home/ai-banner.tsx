import { motion } from 'motion/react';

const FEATURES = ['정통 역학 기반', 'AI 분석', '개인 맞춤형', '실시간 업데이트'];
const featureDelays = FEATURES.map(() => Math.random() * 1.5);

export function AiBanner() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-900 p-0.5"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative rounded-[calc(1.5rem-2px)] bg-gradient-to-br from-violet-950/90 to-indigo-950/90 p-6 text-center md:p-10">
        {/* 배경 glow — float */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[calc(1.5rem-2px)]">
          <motion.div
            className="absolute top-0 left-1/4 h-48 w-48 rounded-full bg-violet-500/20 blur-[60px]"
            animate={{ x: [0, 20, 0], y: [0, 16, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute right-1/4 bottom-0 h-48 w-48 rounded-full bg-indigo-500/20 blur-[60px]"
            animate={{ x: [0, -20, 0], y: [0, -12, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative">
          <motion.p
            className="mb-2 text-3xl"
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.15 }}
          >
            🤖✨
          </motion.p>

          <motion.h3
            className="mb-3 text-xl font-black text-white sm:text-2xl"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            AI 사주 분석의 차이
          </motion.h3>

          <motion.p
            className="mx-auto mb-6 max-w-lg text-sm leading-relaxed text-white/60"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.45 }}
          >
            단순한 통계가 아닙니다. 수천 년의 역학 데이터와 최신 AI 기술의 결합으로
            당신만을 위한 정밀한 운세를 제공합니다.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/70 sm:gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } },
            }}
          >
            {FEATURES.map((f, index) => (
              <motion.div
                key={f}
                className="flex items-center gap-2"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
              >
                <motion.span
                  className="text-violet-400"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: featureDelays[index],
                  }}
                >
                  ✓
                </motion.span>
                <span>{f}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
