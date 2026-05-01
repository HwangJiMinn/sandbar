import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFetcher } from 'react-router';

import type { AdWatchResponse } from '~/lib/ad-types';
import { AD_SKIP_DELAY_MS, AD_TOTAL_DURATION_MS } from '~/lib/token-constants';

// ─── Props ─────────────────────────────────────────────────

interface AdCreditModalProps {
  open: boolean;
  onClose: () => void;
  onGranted: (expiresAt: string) => void;
}

// ─── 광고 시뮬레이션 문구 ───────────────────────────────────

const AD_MESSAGES = [
  '✨ 운결과 함께하세요',
  '🔮 AI 사주 · 궁합 · 운세',
  '💫 당신의 운명을 알아보세요',
  '🌟 지금 바로 시작해보세요',
];

// ─── 컴포넌트 ──────────────────────────────────────────────

type ModalState = 'watching' | 'granting' | 'success' | 'error';

export function AdCreditModal({ open, onClose, onGranted }: AdCreditModalProps) {
  const [state, setState] = useState<ModalState>('watching');
  const [elapsed, setElapsed] = useState(0); // ms
  const [msgIdx, setMsgIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetcher = useFetcher<AdWatchResponse>();

  const totalMs = AD_TOTAL_DURATION_MS;
  const skipAvailableMs = AD_SKIP_DELAY_MS;
  const progress = Math.min(elapsed / totalMs, 1);
  const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
  const canSkip = elapsed >= skipAvailableMs;

  // 모달 열릴 때마다 상태 리셋
  useEffect(() => {
    if (!open) return;
    setState('watching');
    setElapsed(0);
    setMsgIdx(0);
    setErrorMsg('');
  }, [open]);

  // 진행 타이머
  useEffect(() => {
    if (!open || state !== 'watching') return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 100;
        if (next >= totalMs) {
          clearInterval(intervalRef.current!);
          grantCredit();
          return totalMs;
        }
        return next;
      });
    }, 100);

    msgIntervalRef.current = setInterval(() => {
      setMsgIdx((i) => (i + 1) % AD_MESSAGES.length);
    }, 2500);

    return () => {
      clearInterval(intervalRef.current!);
      clearInterval(msgIntervalRef.current!);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state]);

  // 광고 완료 → API 호출
  function grantCredit() {
    clearInterval(intervalRef.current!);
    clearInterval(msgIntervalRef.current!);
    setState('granting');
    fetcher.submit(null, { method: 'POST', action: '/api/ad' });
  }

  // API 응답 처리
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const res = fetcher.data as AdWatchResponse & { error?: string };
    if (res.error) {
      setErrorMsg(res.error);
      setState('error');
    } else {
      setState('success');
      onGranted(res.expiresAt);
    }
  }, [fetcher.state, fetcher.data, onGranted]);

  // 스킵 버튼
  function handleSkip() {
    if (!canSkip) return;
    grantCredit();
  }

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 배경 오버레이 */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={state === 'success' || state === 'error' ? onClose : undefined}
          />

          {/* 모달 카드 */}
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <AnimatePresence mode="wait">
              {/* ── 광고 시청 중 ── */}
              {(state === 'watching' || state === 'granting') && (
                <motion.div
                  key="watching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* 광고 영역 */}
                  <div className="relative flex h-48 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 to-indigo-950 px-6 text-center">
                    {/* 배경 글로우 */}
                    <motion.div
                      className="pointer-events-none absolute inset-0"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="absolute top-1/4 left-1/4 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />
                      <div className="absolute right-1/4 bottom-1/4 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
                    </motion.div>

                    {/* 광고 콘텐츠 */}
                    <motion.p
                      key={msgIdx}
                      className="relative mb-2 text-2xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                    >
                      🔮
                    </motion.p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={msgIdx}
                        className="relative text-base font-bold text-white"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35 }}
                      >
                        {AD_MESSAGES[msgIdx]}
                      </motion.p>
                    </AnimatePresence>

                    {/* 카운트다운 배지 */}
                    <div className="absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-bold text-white/80">
                      {state === 'granting' ? '처리 중...' : `${remaining}초`}
                    </div>

                    {/* 광고 레이블 */}
                    <div className="absolute top-3 left-3 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                      광고
                    </div>
                  </div>

                  {/* 진행바 */}
                  <div className="h-1 w-full bg-white/10">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
                      style={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>

                  {/* 하단 */}
                  <div className="px-5 py-4">
                    <p className="mb-3 text-center text-sm text-white/60">
                      광고를 시청하면{' '}
                      <span className="font-bold text-violet-400">1시간 무료 이용권</span>
                      이 지급됩니다
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={onClose}
                        className="text-xs text-white/30 transition-colors hover:text-white/60"
                      >
                        닫기
                      </button>
                      <motion.button
                        onClick={handleSkip}
                        disabled={!canSkip || state === 'granting'}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                          canSkip && state !== 'granting'
                            ? 'bg-violet-600 text-white hover:bg-violet-500'
                            : 'cursor-not-allowed bg-white/10 text-white/30'
                        }`}
                        animate={
                          canSkip && state === 'watching' ? { scale: [1, 1.04, 1] } : {}
                        }
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        {state === 'granting' ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            처리 중
                          </>
                        ) : canSkip ? (
                          '건너뛰기 →'
                        ) : (
                          `${Math.ceil((skipAvailableMs - elapsed) / 1000)}초 후 건너뛰기`
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── 지급 완료 ── */}
              {state === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center px-6 py-10 text-center"
                >
                  <motion.div
                    className="mb-4 text-5xl"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 16,
                      delay: 0.1,
                    }}
                  >
                    🎉
                  </motion.div>
                  <motion.h3
                    className="mb-2 text-xl font-black text-white"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    1시간 무료 이용권 지급!
                  </motion.h3>
                  <motion.p
                    className="mb-6 text-sm text-white/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    지금부터 1시간 동안 무료 콘텐츠를 자유롭게 이용하세요
                  </motion.p>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white shadow-lg"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    시작하기
                  </motion.button>
                </motion.div>
              )}

              {/* ── 오류 ── */}
              {state === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center px-6 py-10 text-center"
                >
                  <p className="mb-2 text-4xl">⚠️</p>
                  <h3 className="mb-2 text-lg font-bold text-white">
                    오류가 발생했습니다
                  </h3>
                  <p className="mb-6 text-sm text-white/60">{errorMsg}</p>
                  <button
                    onClick={onClose}
                    className="w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/70 transition-colors hover:text-white"
                  >
                    닫기
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
