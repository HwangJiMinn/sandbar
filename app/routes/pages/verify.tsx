import { useEffect, useState } from 'react';
import { type LoaderFunctionArgs, type MetaFunction, useNavigate } from 'react-router';
import { data, Link, useLoaderData } from 'react-router';

import { User } from '~/.server/models/user.model';
import { Logo } from '~/components/ui/logo';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return data({ status: 'invalid', message: '유효하지 않은 인증 링크입니다.' });
  }

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return data({ status: 'invalid', message: '유효하지 않은 인증 링크입니다.' });
    }

    // 이미 인증된 계정 — 토큰이 유효해도 안내만
    if (user.isVerified) {
      return data({
        status: 'already',
        message: '이미 인증이 완료된 계정이에요. 로그인하러 가세요!',
      });
    }

    if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
      return data({
        status: 'expired',
        message: '인증 링크가 만료되었습니다. 다시 요청해주세요.',
      });
    }

    // 인증 완료 — 토큰은 유지 (링크 재방문 시 isVerified 체크로 "이미 인증됨" 안내)
    user.isVerified = true;
    await user.save();

    return data({ status: 'success', message: '이메일 인증이 완료되었습니다!' });
  } catch {
    return data({ status: 'error', message: '서버 오류가 발생했습니다.' });
  }
};

export const meta: MetaFunction = () => [{ title: '이메일 인증 | 운결' }];

// ─── 상태별 설정 ───────────────────────────────────────────

type VerifyStatus = 'success' | 'already' | 'expired' | 'invalid' | 'error';

type StatusConfig = {
  emoji: string;
  title: string;
  gradient: string;
  glow: string;
  borderColor: string;
  badgeText: string;
  badgeColor: string;
  btnGradient: string;
  btnShadow: string;
  redirectLabel: string;
  redirectHref: string;
  autoRedirect: boolean;
};

const STATUS_CONFIG: Record<VerifyStatus, StatusConfig> = {
  success: {
    emoji: '🎉',
    title: '인증 완료!',
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    glow: 'bg-violet-500/20',
    borderColor: 'border-violet-500/30',
    badgeText: '✓ 인증 완료',
    badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    btnGradient: 'from-violet-600 to-purple-600',
    btnShadow: 'shadow-violet-500/30',
    redirectLabel: '로그인하러 가기',
    redirectHref: '/login',
    autoRedirect: true,
  },
  already: {
    emoji: '✅',
    title: '이미 인증된 계정이에요',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    glow: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    badgeText: '✓ 기인증',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    btnGradient: 'from-emerald-600 to-teal-600',
    btnShadow: 'shadow-emerald-500/30',
    redirectLabel: '홈으로 가기',
    redirectHref: '/',
    autoRedirect: false,
  },
  expired: {
    emoji: '⏰',
    title: '인증 링크가 만료됐어요',
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    glow: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    badgeText: '⏳ 만료됨',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    btnGradient: 'from-amber-500 to-orange-500',
    btnShadow: 'shadow-amber-500/30',
    redirectLabel: '인증 메일 재요청',
    redirectHref: '/login',
    autoRedirect: false,
  },
  invalid: {
    emoji: '🔍',
    title: '링크를 찾을 수 없어요',
    gradient: 'from-slate-500 via-slate-600 to-slate-700',
    glow: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
    badgeText: '✗ 유효하지 않음',
    badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    btnGradient: 'from-slate-600 to-slate-700',
    btnShadow: 'shadow-slate-500/30',
    redirectLabel: '홈으로 가기',
    redirectHref: '/',
    autoRedirect: false,
  },
  error: {
    emoji: '⚠️',
    title: '오류가 발생했어요',
    gradient: 'from-rose-500 via-pink-600 to-red-600',
    glow: 'bg-rose-500/20',
    borderColor: 'border-rose-500/30',
    badgeText: '✗ 오류',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    btnGradient: 'from-rose-600 to-pink-600',
    btnShadow: 'shadow-rose-500/30',
    redirectLabel: '홈으로 가기',
    redirectHref: '/',
    autoRedirect: false,
  },
};

// ─── 별 파티클 ─────────────────────────────────────────────

function StarParticles() {
  const items = ['✦', '✧', '⭐', '🌟', '✨', '💫', '⚡', '🔮', '✦', '✧', '🌟', '✨'];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((s, i) => (
        <span
          key={i}
          className="absolute animate-bounce opacity-50"
          style={{
            left: `${8 + ((i * 8) % 84)}%`,
            top: `${10 + ((i * 13) % 70)}%`,
            animationDelay: `${(i * 0.2) % 1.5}s`,
            animationDuration: `${1.5 + (i % 3) * 0.4}s`,
            fontSize: `${12 + (i % 4) * 4}px`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ─── 페이지 ────────────────────────────────────────────────

export default function VerifyPage() {
  const { status, message } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[status as VerifyStatus] ?? STATUS_CONFIG.error;
  const isSuccess = status === 'success';

  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isSuccess) return;
    if (countdown <= 0) {
      navigate('/login');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isSuccess, countdown, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* 배경 glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-40 left-1/2 h-[600px] w-[700px] -translate-x-1/2 rounded-full blur-[120px] ${cfg.glow}`}
        />
        <div
          className={`absolute right-0 bottom-0 h-64 w-64 rounded-full opacity-40 blur-[100px] ${cfg.glow}`}
        />
      </div>

      {/* 성공 시 별 파티클 */}
      {isSuccess && <StarParticles />}

      <div className="relative z-10 w-full max-w-md">
        {/* 로고 */}
        <div className="mb-10 flex flex-col items-center gap-1">
          <Link to="/" className="text-5xl transition-transform hover:scale-110">
            <Logo className="h-40 w-auto" />
          </Link>
        </div>

        {/* 메인 카드 */}
        <div className={`rounded-3xl bg-gradient-to-br p-0.5 ${cfg.gradient}`}>
          <div className="relative overflow-hidden rounded-[calc(1.5rem-2px)] bg-background/96 px-8 py-10 text-center">
            {/* 상단 그라디언트 띠 */}
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cfg.gradient}`}
            />

            {/* 이모지 아이콘 */}
            <div
              className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border text-4xl ${cfg.borderColor} ${cfg.glow}`}
            >
              {cfg.emoji}
            </div>

            {/* 제목 */}
            <h1
              className={`mb-3 bg-gradient-to-r bg-clip-text text-2xl font-black text-transparent ${cfg.gradient}`}
            >
              {cfg.title}
            </h1>

            {/* 메시지 */}
            <p className="mb-6 text-sm leading-relaxed text-foreground/60">{message}</p>

            {/* 상태 뱃지 */}
            <div className="mb-6 flex justify-center">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.badgeColor}`}
              >
                {cfg.badgeText}
              </span>
            </div>

            {/* 성공: 자동 리다이렉트 카운트다운 */}
            {isSuccess && (
              <div
                className={`mb-6 rounded-xl border px-4 py-3 ${cfg.borderColor} bg-violet-500/5`}
              >
                <p className="text-sm text-foreground/60">
                  <span className="font-semibold text-violet-400">{countdown}초</span> 후
                  로그인 페이지로 이동합니다
                </p>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ${cfg.gradient}`}
                    style={{ width: `${(countdown / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* 만료: 재인증 방법 안내 */}
            {status === 'expired' && (
              <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left">
                <p className="mb-1 text-xs font-semibold text-amber-400">
                  💡 어떻게 하면 되나요?
                </p>
                <p className="text-xs leading-relaxed text-foreground/50">
                  로그인 페이지에서 동일한 이메일로 회원가입을 시도하면
                  <br />새 인증 메일을 자동으로 발송해드립니다.
                </p>
              </div>
            )}

            {/* CTA 버튼 */}
            <Link
              to={cfg.redirectHref}
              className={`block w-full rounded-xl bg-gradient-to-r py-3.5 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:opacity-90 ${cfg.btnGradient} ${cfg.btnShadow}`}
            >
              {cfg.redirectLabel} →
            </Link>

            {/* 보조 홈 링크 */}
            {cfg.redirectHref !== '/' && (
              <Link
                to="/"
                className="mt-4 block text-sm text-foreground/35 transition-colors hover:text-foreground/60"
              >
                홈으로 돌아가기
              </Link>
            )}
          </div>
        </div>

        {/* 하단 문의 */}
        <p className="mt-8 text-center text-xs text-foreground/25">
          문제가 지속되면{' '}
          <a
            href="mailto:support@fortune-star.kr"
            className="underline hover:text-foreground/50"
          >
            고객센터
          </a>
          로 문의해주세요
        </p>
      </div>
    </div>
  );
}
