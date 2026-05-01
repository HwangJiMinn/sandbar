import { index, layout, prefix, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  // * Pages — 헤더/푸터 있는 기본 레이아웃
  layout('routes/layouts/default.tsx', [
    index('routes/pages/home.tsx'),
    route('saju', 'routes/pages/saju.tsx'),
    route('gunghap', 'routes/pages/gunghap.tsx'),
    route('ai-saju', 'routes/pages/ai-saju.tsx'),
    route('tokens', 'routes/pages/tokens.tsx'),
    route('profile', 'routes/pages/profile.tsx'),
    route('history', 'routes/pages/history.tsx'),
    route('name', 'routes/pages/name.tsx'),
    route('usage', 'routes/pages/usage.tsx'),
    route('new-year', 'routes/pages/new-year.tsx'),
    route('lifetime', 'routes/pages/lifetime.tsx'),
  ]),

  // * 인증 페이지 — 헤더/푸터 없음
  route('login', 'routes/pages/login.tsx'),
  route('verify', 'routes/pages/verify.tsx'),

  // * APIs
  ...prefix('api', [
    route('theme', 'routes/apis/theme.ts'),
    route('language', 'routes/apis/language.ts'),
    route('auth', 'routes/apis/auth.ts'),
    route('saju', 'routes/apis/saju.ts'),
    route('saju-interpret', 'routes/apis/saju-interpret.ts'),
    route('gunghap', 'routes/apis/gunghap.ts'),
    route('gunghap-interpret', 'routes/apis/gunghap-interpret.ts'),
    route('token', 'routes/apis/token.ts'),
    route('profile', 'routes/apis/profile.ts'),
    route('ad', 'routes/apis/ad.ts'),
    route('ai-saju', 'routes/apis/ai-saju.ts'),
    route('ai-saju-chat', 'routes/apis/ai-saju-chat.ts'),
    route('ai-saju-cancel', 'routes/apis/ai-saju-cancel.ts'),
    route('name', 'routes/apis/name.ts'),
    route('name-interpret', 'routes/apis/name-interpret.ts'),
    route('new-year', 'routes/apis/new-year.ts'),
    route('new-year-interpret', 'routes/apis/new-year-interpret.ts'),
    route('lifetime-interpret', 'routes/apis/lifetime-interpret.ts'),
  ]),
] satisfies RouteConfig;
