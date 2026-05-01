import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 오버레이 */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
          />

          {/* 모달 */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
              {/* 내용 */}
              <div className="px-6 pt-6 pb-5">
                <p className="mb-1.5 text-base font-bold text-foreground">{title}</p>
                {description && (
                  <p className="text-sm leading-relaxed text-foreground/55">
                    {description}
                  </p>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 border-t border-border/60 px-4 py-3">
                <button
                  onClick={onCancel}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground/60 transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 ${
                    confirmVariant === 'danger'
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-violet-600 to-purple-600'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
