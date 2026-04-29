import { index, prefix, route, type RouteConfig } from '@react-router/dev/routes';

// TODO: 경로 정의 (https://reactrouter.com/start/framework/routing)
export default [
  // * Pages
  index('routes/pages/home.tsx'),

  // * APIs
  ...prefix('api', [
    route('theme', 'routes/apis/theme.ts'),
    route('language', 'routes/apis/language.ts'),
  ]),
] satisfies RouteConfig;
