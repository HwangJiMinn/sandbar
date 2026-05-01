import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
  useOutletContext,
} from 'react-router';

import { TOKEN_PACKAGES } from '~/.server/controllers/token.controller';
import { getSessionUser } from '~/.server/services/session.service';
import { TokenIcon } from '~/components/ui/token-icon';
import useEasyFetcher from '~/hooks/use-easy-fetcher';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  if (!user) return redirect('/login');

  return data({ packages: TOKEN_PACKAGES });
};

export const meta: MetaFunction = () => [
  { title: '충전 | 운결' },
  { name: 'description', content: '토큰을 충전하여 AI 사주 해석을 이용하세요.' },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const PACKAGE_ICONS = ['✨', '⚡', '🌟', '👑'];
const PACKAGE_COLORS = [
  'from-slate-600/30 to-slate-700/20 border-slate-500/30',
  'from-violet-600/30 to-purple-700/20 border-violet-500/40',
  'from-blue-600/30 to-indigo-700/20 border-blue-500/30',
  'from-amber-500/30 to-orange-600/20 border-amber-400/40',
];
const PACKAGE_BUTTON_COLORS = [
  'bg-slate-600 hover:bg-slate-500',
  'bg-violet-600 hover:bg-violet-500',
  'bg-blue-600 hover:bg-blue-500',
  'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90',
];

type Package = {
  id: string;
  tokens: number;
  price: number;
  label: string;
  badge: string | null;
};

export default function TokensPage() {
  const { packages } = useLoaderData<typeof loader>();
  const { tokenBalance: balance } = useOutletContext<DefaultLayoutContext>();

  const { fetcher, isLoading } = useEasyFetcher<{
    success: boolean;
    balanceAfter: number;
    added: number;
  }>();
  const [purchasedPkg, setPurchasedPkg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handlePurchase = (pkg: Package) => {
    setPurchasedPkg(pkg.id);
    fetcher.submit(
      { packageId: pkg.id },
      { method: 'POST', action: '/api/token', encType: 'application/json' },
    );
  };

  // Show toast on successful purchase
  if (fetcher.data?.success && toastMsg === null && purchasedPkg) {
    const added = fetcher.data.added;
    setToastMsg(`${added.toLocaleString()} 토큰이 충전되었습니다!`);
    setPurchasedPkg(null);
    setTimeout(() => setToastMsg(null), 3000);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
        {/* 페이지 타이틀 */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <motion.div
            className="mb-4 text-5xl"
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 4,
              ease: 'easeInOut',
            }}
          >
            ⚡
          </motion.div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            <TokenIcon className="mr-1" /> 충전
          </h1>
          <p className="mt-2 text-sm text-foreground/50">
            기능에 따라 100 결 ~ 500 결이 사용됩니다
          </p>
        </motion.div>

        {/* 현재 잔액 카드 */}
        <motion.div
          className="mb-10 overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-900/40 to-purple-900/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
        >
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <div>
              <p className="text-sm text-foreground/50">
                현재 보유 <TokenIcon className="" />
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white sm:text-5xl">
                  {balance.toLocaleString()}
                </span>
                <TokenIcon className="" />
              </div>
              <p className="mt-1 text-xs text-foreground/40">
                ≈ {balance.toLocaleString()}원
              </p>
            </div>
            <div className="space-y-1 sm:text-right">
              <div>
                <p className="text-xs text-foreground/40">간단 풀이 (100 결)</p>
                <p className="text-base font-bold text-violet-300">
                  약 {Math.floor(balance / 100).toLocaleString()}회
                </p>
              </div>
              <div>
                <p className="text-xs text-foreground/40">정밀 풀이 (500 결)</p>
                <p className="text-base font-bold text-violet-300">
                  약 {Math.floor(balance / 500).toLocaleString()}회
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 패키지 그리드 */}
        <motion.div
          className="mb-12"
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
          }}
        >
          <h2 className="mb-5 text-lg font-bold text-foreground">충전 패키지</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 ${PACKAGE_COLORS[i]}`}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
                }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                {/* 뱃지 */}
                {pkg.badge && (
                  <span className="absolute top-4 right-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {pkg.badge}
                  </span>
                )}

                <div className="mb-4 text-3xl">{PACKAGE_ICONS[i]}</div>
                <p className="text-sm font-medium text-foreground/60">{pkg.label}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-foreground">
                    {pkg.tokens.toLocaleString()}
                  </span>
                  <TokenIcon className="" />
                </div>
                <p className="mt-0.5 text-xs text-foreground/40">
                  경량 {Math.floor(pkg.tokens / 100)}회 · 프리미엄{' '}
                  {Math.floor(pkg.tokens / 500)}회
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">
                    {pkg.price.toLocaleString()}원
                  </span>
                  <motion.button
                    className={`rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 ${PACKAGE_BUTTON_COLORS[i]}`}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handlePurchase(pkg)}
                    disabled={isLoading && purchasedPkg === pkg.id}
                  >
                    {isLoading && purchasedPkg === pkg.id ? '처리 중...' : '충전하기'}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 이용 안내 */}
        <motion.div
          className="mb-12 rounded-2xl border border-border bg-secondary/30 p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-foreground/70">이용 안내</h3>
          <ul className="space-y-1.5 text-xs text-foreground/50">
            <li>• 간단 풀이 (일운, 이름풀이 등) 1회 이용 시 100 결이 차감됩니다.</li>
            <li>• 정밀 풀이 (사주, 궁합 등) 1회 이용 시 500 결이 차감됩니다.</li>
            <li>• 사주팔자 계산은 무료로 이용할 수 있습니다.</li>
            <li>• 충전된 결은 환불이 불가능합니다.</li>
            <li>• 현재 결제 시스템은 테스트 환경입니다 (실제 결제 미적용).</li>
          </ul>
        </motion.div>
      </main>

      {/* 토스트 알림 */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            ✓ {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
