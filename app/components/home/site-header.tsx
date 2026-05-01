import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';

import type { AuthSessionUser } from '~/.server/services/session.service';
import { AdCreditBadge } from '~/components/ad/ad-credit-badge';
import { Logo } from '~/components/ui/logo';
import { TokenIcon } from '~/components/ui/token-icon';

import { SECTIONS } from './sections-data';

interface SiteHeaderProps {
  user?: AuthSessionUser | null;
  tokenBalance?: number | null;
}

export function SiteHeader({ user, tokenBalance }: SiteHeaderProps) {
  const [showTokenTooltip, setShowTokenTooltip] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();

  const handleSectionClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // 홈: 모바일 메뉴 닫힘 애니메이션(250ms) 이후 스크롤
      setMobileMenuOpen(false);
      setTimeout(() => {
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 260);
    } else {
      // 다른 페이지: 브라우저 해시 네비게이션에 맡기면 자동 스크롤
      setMobileMenuOpen(false);

      window.location.href = `/#${id}`;
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
        {/* 로고 */}
        <motion.div
          className="h-14 flex-none overflow-hidden"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link to="/" className="flex h-full items-center">
            <Logo className="h-20 w-auto" />
          </Link>
        </motion.div>

        {/* 데스크탑 네비게이션 — 절대 중앙 */}
        <motion.nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
          }}
        >
          {SECTIONS.map((s) => (
            <motion.a
              key={s.id}
              href={`/#${s.id}`}
              onClick={(e) => handleSectionClick(e, s.id)}
              className="text-sm text-foreground/60 transition-colors hover:text-foreground"
              variants={{
                hidden: { opacity: 0, y: -8 },
                show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
              }}
              whileHover={{ y: -1 }}
            >
              {s.title.split(' ')[0]}
            </motion.a>
          ))}
        </motion.nav>

        {/* 우측 영역 밀어내기용 spacer */}
        <div className="flex-1" />

        {/* 우측: 테마 + 인증 + 모바일 메뉴 버튼 */}
        <motion.div
          className="flex flex-none items-center gap-2"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* 데스크탑 전용 인증 버튼 */}
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                {/* 광고 크레딧 배지 */}
                <AdCreditBadge />
                {/* 유저 뱃지 + 토큰 툴팁 */}
                <div
                  className="relative"
                  onMouseEnter={() => setShowTokenTooltip(true)}
                  onMouseLeave={() => setShowTokenTooltip(false)}
                >
                  <div className="flex cursor-default items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[80px] truncate text-sm font-medium text-foreground">
                      {user.name}
                    </span>
                  </div>

                  <AnimatePresence>
                    {showTokenTooltip && (
                      <motion.div
                        className="absolute top-full right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-background shadow-xl"
                        initial={{ opacity: 0, y: -6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/30 p-4">
                          <div className="mb-0.5 flex items-center gap-1 text-xs text-foreground/50">
                            <span>보유</span>
                            <TokenIcon className="" />
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">
                              {tokenBalance != null ? tokenBalance.toLocaleString() : '—'}
                            </span>
                            <TokenIcon className="" />
                          </div>
                          <p className="mt-0.5 text-[10px] text-foreground/40">
                            ≈{' '}
                            {tokenBalance != null
                              ? `${tokenBalance.toLocaleString()}원`
                              : '—'}
                          </p>
                        </div>
                        <div className="space-y-1.5 p-2">
                          <Link
                            to="/profile"
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-foreground/70 transition-colors hover:border-violet-500/40 hover:text-violet-300"
                            onClick={() => setShowTokenTooltip(false)}
                          >
                            <span>👤</span>
                            <span>내 정보</span>
                          </Link>
                          <Link
                            to="/history"
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-foreground/70 transition-colors hover:border-violet-500/40 hover:text-violet-300"
                            onClick={() => setShowTokenTooltip(false)}
                          >
                            <span>📋</span>
                            <span>내 해석 기록</span>
                          </Link>
                          <Link
                            to="/usage"
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-foreground/70 transition-colors hover:border-violet-500/40 hover:text-violet-300"
                            onClick={() => setShowTokenTooltip(false)}
                          >
                            <span>📊</span>
                            <span>사용내역</span>
                          </Link>
                          <Link
                            to="/tokens"
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                            onClick={() => setShowTokenTooltip(false)}
                          >
                            <TokenIcon className="" />
                            <span>충전하기</span>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-full border border-border px-3 py-2 text-xs text-foreground/60 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                >
                  {isLoggingOut ? '...' : '로그아웃'}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                className="flex items-center gap-2"
                initial="hidden"
                animate="show"
                variants={{
                  show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
                }}
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: -6 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                  }}
                >
                  <Link
                    to="/login"
                    className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    로그인
                  </Link>
                </motion.div>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: -6 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Link
                    to="/login"
                    className="rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
                  >
                    무료 회원가입
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* 모바일 햄버거 버튼 */}
          <motion.button
            className="flex items-center justify-center rounded-full border border-border p-2 sm:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            whileTap={{ scale: 0.9 }}
            aria-label="메뉴 열기"
          >
            <motion.span
              className="block text-sm leading-none text-foreground"
              animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </motion.span>
          </motion.button>
        </motion.div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="overflow-hidden border-t border-border/50 bg-background/95 sm:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-4 py-3">
              {/* ── 유저 정보 (최상단) ── */}
              {user ? (
                <div className="mb-3">
                  {/* 프로필 카드 */}
                  <div className="mb-2 overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/60 to-purple-950/40">
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-foreground/50">
                          {user.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-black text-violet-300">
                            {tokenBalance != null ? tokenBalance.toLocaleString() : '—'}
                          </p>
                          <TokenIcon className="" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2.5">
                      <div className="flex-1">
                        <AdCreditBadge />
                      </div>
                      <Link
                        to="/tokens"
                        className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <TokenIcon className="" />
                        <span>충전</span>
                      </Link>
                    </div>
                  </div>

                  {/* 내 정보 / 해석 기록 / 사용내역 그리드 */}
                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      to="/profile"
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/30 px-2 py-2.5 text-xs font-medium text-foreground/70 transition-colors hover:border-violet-500/40 hover:text-violet-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>👤</span>
                      <span>내 정보</span>
                    </Link>
                    <Link
                      to="/history"
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/30 px-2 py-2.5 text-xs font-medium text-foreground/70 transition-colors hover:border-violet-500/40 hover:text-violet-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>📋</span>
                      <span>해석 기록</span>
                    </Link>
                    <Link
                      to="/usage"
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/30 px-2 py-2.5 text-xs font-medium text-foreground/70 transition-colors hover:border-violet-500/40 hover:text-violet-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>📊</span>
                      <span>사용내역</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex flex-col gap-2">
                  <Link
                    to="/login"
                    className="w-full rounded-xl border border-border py-2.5 text-center text-sm font-medium text-foreground/70"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    로그인
                  </Link>
                  <Link
                    to="/login"
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-center text-sm font-semibold text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    무료 회원가입
                  </Link>
                </div>
              )}

              <div className="mb-2 h-px bg-border/50" />

              {/* ── 섹션 네비게이션 ── */}
              <div className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`/#${s.id}`}
                    className="block rounded-xl px-3 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
                    onClick={(e) => handleSectionClick(e, s.id)}
                  >
                    {s.title}
                  </a>
                ))}
              </div>

              {/* ── 로그아웃 ── */}
              {user && (
                <>
                  <div className="my-2 h-px bg-border/50" />
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isLoggingOut}
                    className="w-full rounded-xl border border-border py-2.5 text-sm text-foreground/50 transition-colors hover:border-rose-500/30 hover:text-rose-400 disabled:opacity-50"
                  >
                    {isLoggingOut ? '...' : '로그아웃'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
