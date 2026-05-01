import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

import type { AdCreditStatus } from '~/lib/ad-types';

import { AdCreditModal } from './ad-credit-modal';

// ─── 컴포넌트 ──────────────────────────────────────────────

export function AdCreditBadge() {
  const fetcher = useFetcher<AdCreditStatus>();
  const [modalOpen, setModalOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [canWatch, setCanWatch] = useState(true);
  const [remainingMs, setRemainingMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 마운트 시 크레딧 상태 로드
  useEffect(() => {
    fetcher.load('/api/ad');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // API 응답 반영
  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;
    const d = fetcher.data as AdCreditStatus;
    setExpiresAt(d.expiresAt);
    setCanWatch(d.canWatch);
    if (d.expiresAt) {
      setRemainingMs(new Date(d.expiresAt).getTime() - Date.now());
    }
  }, [fetcher.state, fetcher.data]);

  // 남은 시간 카운트다운
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!expiresAt) return;

    timerRef.current = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(ms);
      if (ms <= 0) {
        clearInterval(timerRef.current!);
        setExpiresAt(null);
        setCanWatch(true);
        setRemainingMs(0);
      }
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [expiresAt]);

  // 광고 시청 완료 콜백
  const handleGranted = useCallback(
    (newExpiresAt: string) => {
      setExpiresAt(newExpiresAt);
      setCanWatch(false);
      setRemainingMs(new Date(newExpiresAt).getTime() - Date.now());
      setModalOpen(false);
      // 서버 상태도 갱신
      fetcher.load('/api/ad');
    },
    [fetcher],
  );

  const isActive = expiresAt !== null && remainingMs > 0;

  return (
    <>
      <AnimatePresence mode="wait">
        {!isActive && canWatch ? (
          /* 크레딧 없음 → 광고 시청 유도 */
          <motion.button
            key="watch"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setModalOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 transition-colors hover:border-amber-400/50 hover:bg-amber-500/20"
          >
            <span className="text-xs">📺</span>
            <span className="text-xs font-semibold text-amber-400">
              광고 보고 1시간 무료
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AdCreditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGranted={handleGranted}
      />
    </>
  );
}
