import { useState } from 'react';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { Link, redirect, useNavigate } from 'react-router';

import { getSessionUser } from '~/.server/services/session.service';
import { Logo } from '~/components/ui/logo';
import useEasyFetcher from '~/hooks/use-easy-fetcher';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  if (user) throw redirect('/');
  return null;
};

export const meta: MetaFunction = () => [
  { title: '로그인 | 운결' },
  { name: 'description', content: '운결에 로그인하고 나만의 운세를 확인하세요.' },
];

type Mode = 'login' | 'register';

interface AuthResponse {
  user?: { id: string; email: string; name: string };
  message?: string;
  error?: { message: string; path?: string };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  // 회원가입 완료 후 "메일 확인 안내" 화면
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // ── 메인 폼 fetcher ────────────────────────────────────
  const { fetcher, isLoading } = useEasyFetcher<AuthResponse>((res) => {
    if (!res) return;
    if (res.error) {
      if (res.error.path) setFieldError({ [res.error.path]: res.error.message });
      else setFieldError({ _form: res.error.message });
      return;
    }
    if (res.user) {
      navigate('/');
      return;
    }
    if (res.message) {
      // 회원가입 완료 → 인증 메일 발송됨
      setPendingEmail(form.email);
    }
  });

  // ── 재발송 fetcher ─────────────────────────────────────
  const { fetcher: resendFetcher, isLoading: isResending } = useEasyFetcher<AuthResponse>(
    (res) => {
      if (!res) return;
      if (res.error) {
        setFieldError({ _form: res.error.message });
        return;
      }
      if (res.message) {
        setFieldError({ _success: res.message });
      }
    },
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldError({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});
    const payload =
      mode === 'login'
        ? { action: 'login', email: form.email, password: form.password }
        : {
            action: 'register',
            name: form.name,
            email: form.email,
            password: form.password,
          };

    fetcher.submit(payload, {
      method: 'POST',
      action: '/api/auth',
      encType: 'application/json',
    });
  };

  const handleResend = () => {
    if (!pendingEmail) return;
    setFieldError({});
    resendFetcher.submit(
      { action: 'resend-verification', email: pendingEmail },
      { method: 'POST', action: '/api/auth', encType: 'application/json' },
    );
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setForm({ name: '', email: '', password: '' });
    setFieldError({});
    setPendingEmail(null);
  };

  // ── 인증 메일 발송 완료 화면 ───────────────────────────
  if (pendingEmail) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-sm text-center">
          <Link to="/" className="mb-8 inline-flex flex-col items-center gap-1">
            <Logo className="h-40 w-auto" />
          </Link>

          <div className="mb-6 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-0.5">
            <div className="rounded-[calc(1.5rem-2px)] bg-background/95 px-8 py-10">
              <div className="mb-4 text-5xl">📬</div>
              <h1 className="mb-3 text-xl font-black text-foreground">
                인증 메일을 보냈어요!
              </h1>
              <p className="mb-1 text-sm leading-relaxed text-foreground/60">
                <span className="font-semibold text-violet-400">{pendingEmail}</span>으로
              </p>
              <p className="text-sm leading-relaxed text-foreground/60">
                인증 링크를 발송했습니다.
                <br />
                메일함을 확인하고 링크를 클릭해주세요.
              </p>

              {/* 안내 박스 */}
              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left">
                <p className="mb-1 text-xs font-semibold text-amber-400">
                  📌 메일이 안 보이나요?
                </p>
                <p className="text-xs leading-relaxed text-foreground/50">
                  스팸 또는 프로모션 탭을 확인해보세요.
                  <br />
                  인증 링크는 24시간 동안 유효합니다.
                </p>
              </div>

              {/* 성공/에러 메시지 */}
              {fieldError._success && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
                  {fieldError._success}
                </div>
              )}
              {fieldError._form && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">
                  {fieldError._form}
                </div>
              )}
            </div>
          </div>

          {/* 재발송 버튼 */}
          <button
            onClick={handleResend}
            disabled={isResending}
            className="w-full rounded-xl border border-border bg-secondary/40 py-3 text-sm font-semibold text-foreground/70 transition-colors hover:border-violet-500/40 hover:text-violet-400 disabled:opacity-50"
          >
            {isResending ? '발송 중...' : '✉️ 인증 메일 재발송'}
          </button>

          <button
            onClick={() => {
              setPendingEmail(null);
              switchMode();
            }}
            className="mt-3 w-full text-sm text-foreground/40 transition-colors hover:text-foreground/70"
          >
            ← 로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ── 메인 로그인/회원가입 폼 ─────────────────────────────
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-foreground/50 transition-colors hover:text-foreground"
      >
        ← 홈으로
      </Link>

      <div className="relative w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Link to="/" className="text-4xl">
            <Logo className="h-40 w-auto" />
          </Link>
          <p className="text-sm text-foreground/50">
            {mode === 'login' ? '계정에 로그인하세요' : '지금 바로 시작하세요'}
          </p>
        </div>

        {/* 탭 */}
        <div className="mb-6 flex rounded-xl border border-border bg-secondary/40 p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={switchMode}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/50 hover:text-foreground'
              }`}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fieldError._form && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {fieldError._form}
            </div>
          )}

          {mode === 'register' && (
            <Field
              label="이름"
              name="name"
              type="text"
              placeholder="홍길동"
              value={form.name}
              onChange={handleChange}
              error={fieldError.name}
            />
          )}

          <Field
            label="이메일"
            name="email"
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={handleChange}
            error={fieldError.email}
          />

          <Field
            label="비밀번호"
            name="password"
            type="password"
            placeholder={mode === 'register' ? '8자 이상 입력' : '비밀번호 입력'}
            value={form.password}
            onChange={handleChange}
            error={fieldError.password}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {mode === 'login' ? '로그인 중...' : '가입 중...'}
              </span>
            ) : mode === 'login' ? (
              '🔮 로그인'
            ) : (
              '✨ 회원가입'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/50">
          {mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          <button
            onClick={switchMode}
            className="ml-1.5 font-semibold text-violet-400 transition-colors hover:text-violet-300"
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Field 컴포넌트 ────────────────────────────────────────

function Field({
  label,
  name,
  type,
  placeholder,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground/70">{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={type === 'password' ? 'current-password' : name}
        className={`w-full rounded-xl border bg-secondary/30 px-4 py-3 text-sm text-foreground transition-colors outline-none placeholder:text-foreground/30 focus:border-violet-500/60 focus:bg-secondary/50 ${
          error ? 'border-rose-500/50' : 'border-border'
        }`}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
