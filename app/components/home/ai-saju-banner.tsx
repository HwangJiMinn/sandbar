import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

// ─── 데모 대화 ─────────────────────────────────────────────

const DEMO = [
  { role: 'user', text: '제 올해 연애운이 어떤가요?' },
  {
    role: 'assistant',
    text: '경술 일간이신 분은 올해 인연의 기운이 강하게 흘러요. 특히 여름 이후 새로운 만남이 찾아올 가능성이 높습니다.',
  },
  { role: 'user', text: '이직을 고려 중인데 지금 시기가 맞나요?' },
  {
    role: 'assistant',
    text: '역마살이 활성화되는 시기라 이직은 오히려 길한 선택이 될 수 있어요. 다만 가을 이후를 더 추천드립니다.',
  },
];

// ─── 컴포넌트 ──────────────────────────────────────────────

export function AiSajuBanner() {
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    if (visible >= DEMO.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 2000);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-violet-950 to-purple-950 p-0.5"
    >
      <div className="relative overflow-hidden rounded-[calc(1.5rem-2px)]">
        {/* 배경 glow */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-violet-500/20 blur-[80px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-indigo-500/20 blur-[60px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        <div className="relative flex flex-col gap-8 px-6 py-8 sm:px-8 lg:flex-row lg:items-center lg:gap-12">
          {/* ── 왼쪽: 텍스트 ── */}
          <div className="flex-1">
            <motion.div
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                🤖
              </motion.span>
              <span>NEW · AI 대화형 사주</span>
            </motion.div>

            <motion.h2
              className="mb-3 text-2xl leading-tight font-black text-white sm:text-3xl"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              AI와 대화하며 풀어보는
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                나의 사주
              </span>
            </motion.h2>

            <motion.p
              className="mb-6 text-sm leading-relaxed text-white/55"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.27, duration: 0.45 }}
            >
              생년월일만 입력하면 AI 사주 전문가가 분석을 시작해요.
              <br />
              연애, 직장, 건강, 재물 무엇이든 자유롭게 물어보세요.
            </motion.p>

            <motion.div
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.33, duration: 0.4 }}
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/ai-saju"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-3 font-bold text-white shadow-lg shadow-violet-500/30 transition-opacity hover:opacity-90"
                >
                  <span>🤖</span>
                  <span>지금 상담 시작하기</span>
                  <span className="text-violet-200">→</span>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* ── 오른쪽: 채팅 미리보기 ── */}
          <div className="w-full shrink-0 lg:w-80">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
              {/* 헤더 */}
              <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm">
                  🔮
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">AI 사주 전문가</p>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-white/40">온라인</span>
                  </div>
                </div>
              </div>

              {/* 메시지들 */}
              <div className="space-y-3 p-4">
                <AnimatePresence>
                  {DEMO.slice(0, visible).map((msg, i) => (
                    <motion.div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'rounded-tr-sm bg-violet-600 text-white'
                            : 'rounded-tl-sm border border-white/10 bg-white/8 text-white/80'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* 타이핑 인디케이터 */}
                {visible < DEMO.length && DEMO[visible].role === 'assistant' && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border border-white/10 bg-white/8 px-3 py-2.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-violet-400"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
