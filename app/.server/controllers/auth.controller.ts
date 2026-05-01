import { randomBytes } from 'crypto';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data, redirect } from 'react-router';

import { hashPassword, verifyPassword } from '~/.server/lib/crypto';
import { verificationEmailHtml } from '~/.server/lib/email-templates/verification';
import {
  AlreadyExistsException,
  HttpException,
  InvalidException,
  MethodNotAllowedException,
  NotFoundException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { sendMail } from '~/.server/lib/mailer';
import { env, handleServerError, validate } from '~/.server/lib/utils';
import { User } from '~/.server/models/user.model';
import { loginSchema, registerSchema } from '~/.server/schemas/auth';
import { getAuthSession, getSessionUser } from '~/.server/services/session.service';

// ─── 토큰 생성 헬퍼 ───────────────────────────────────────

const generateVerificationToken = () => randomBytes(32).toString('hex');

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24시간

// ─── Loader: 현재 세션 유저 반환 ──────────────────────────

export const authLoader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await getSessionUser(request);
    return data({ user });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action ───────────────────────────────────────────────

export const authAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const body = await request.json();
    const { action: authAction, ...payload } = body as {
      action: string;
      [key: string]: unknown;
    };

    switch (authAction) {
      // ── 회원가입 ──────────────────────────────────────────
      case 'register': {
        validate(registerSchema, payload);
        const { name, email, password } = payload as {
          name: string;
          email: string;
          password: string;
        };

        // 중복 이메일 체크
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
          // 이미 인증된 계정
          if (existing.isVerified) {
            throw new AlreadyExistsException('이미 사용 중인 이메일입니다.', 'email');
          }
          // 미인증 계정 → 인증 메일 재발송
          const token = generateVerificationToken();
          existing.verificationToken = token;
          existing.verificationTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_MS);
          await existing.save();

          await sendVerificationEmail(existing.email, existing.name, token, request);

          return data(
            { message: '인증 메일을 재발송했습니다. 이메일을 확인해주세요.' },
            { status: 200 },
          );
        }

        // 신규 계정 생성
        const hashed = await hashPassword(password);
        const token = generateVerificationToken();

        await User.create({
          name,
          email: email.toLowerCase(),
          password: hashed,
          isVerified: false,
          verificationToken: token,
          verificationTokenExpiry: new Date(Date.now() + TOKEN_EXPIRY_MS),
        });

        await sendVerificationEmail(email.toLowerCase(), name, token, request);

        return data(
          { message: '가입 완료! 이메일로 발송된 인증 링크를 클릭해주세요.' },
          { status: 201 },
        );
      }

      // ── 로그인 ────────────────────────────────────────────
      case 'login': {
        validate(loginSchema, payload);
        const { email, password } = payload as { email: string; password: string };

        const user = await User.findOne({ email: email.toLowerCase() }).select(
          '+password',
        );
        if (!user) {
          throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
          throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }

        // 이메일 미인증 체크
        if (!user.isVerified) {
          throw new InvalidException(
            '이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.',
            'email',
          );
        }

        const authSession = await getAuthSession(request);
        authSession.setUser({ id: String(user._id), email: user.email, name: user.name });

        return data(
          { user: { id: String(user._id), email: user.email, name: user.name } },
          { status: 200, headers: { 'Set-Cookie': await authSession.commit() } },
        );
      }

      // ── 인증 메일 재발송 ──────────────────────────────────
      case 'resend-verification': {
        const { email } = payload as { email: string };
        if (!email) throw new InvalidException('이메일을 입력해주세요.', 'email');

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) throw new NotFoundException('등록되지 않은 이메일입니다.', 'email');
        if (user.isVerified)
          throw new InvalidException('이미 인증된 계정입니다.', 'email');

        const token = generateVerificationToken();
        user.verificationToken = token;
        user.verificationTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_MS);
        await user.save();

        await sendVerificationEmail(user.email, user.name, token, request);

        return data({ message: '인증 메일을 재발송했습니다.' }, { status: 200 });
      }

      // ── 로그아웃 ──────────────────────────────────────────
      case 'logout': {
        const authSession = await getAuthSession(request);
        return redirect('/', {
          headers: { 'Set-Cookie': await authSession.destroy() },
        });
      }

      default:
        throw new MethodNotAllowedException(`알 수 없는 액션: ${authAction}`);
    }
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── 이메일 인증 처리 (Loader) ─────────────────────────────
// GET /verify?token=xxx

export const verifyEmailLoader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return data({
      status: 'invalid' as const,
      message: '유효하지 않은 인증 링크입니다.',
    });
  }

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return data({
        status: 'invalid' as const,
        message: '인증 링크를 찾을 수 없습니다.',
      });
    }

    if (user.isVerified) {
      return data({ status: 'already' as const, message: '이미 인증된 계정입니다.' });
    }

    if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
      return data({
        status: 'expired' as const,
        message: '인증 링크가 만료되었습니다. 다시 요청해주세요.',
      });
    }

    // 인증 완료 (토큰 유지 — 재방문 시 isVerified 체크로 "이미 인증됨" 안내)
    user.isVerified = true;
    await user.save();

    return data({ status: 'success' as const, message: '이메일 인증이 완료되었습니다!' });
  } catch (error) {
    if (error instanceof HttpException) {
      return data({ status: 'error' as const, message: error.message });
    }
    return data({ status: 'error' as const, message: '서버 오류가 발생했습니다.' });
  }
};

// ─── 헬퍼: 인증 메일 발송 ─────────────────────────────────

async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  request: Request,
) {
  const appUrl = env('APP_URL', `${new URL(request.url).origin}`);
  const verifyUrl = `${appUrl}/verify?token=${token}`;

  await sendMail({
    to: email,
    subject: '✨ 운결 이메일 인증',
    html: verificationEmailHtml({ name, verifyUrl }),
  });
}
