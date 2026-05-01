import { motion } from 'motion/react';
import {
  data,
  Link,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
  useOutletContext,
} from 'react-router';

import { TokenTransaction } from '~/.server/models/token-transaction.model';
import { getSessionUser } from '~/.server/services/session.service';
import { TokenIcon } from '~/components/ui/token-icon';
import type { DefaultLayoutContext } from '~/routes/layouts/default';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  if (!user) return redirect('/login');

  const transactions = await TokenTransaction.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return data({
    transactions: transactions.map((t) => ({
      id: String(t._id),
      amount: t.amount,
      type: t.type,
      description: t.description,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt,
    })),
  });
};

export const meta: MetaFunction = () => [
  { title: '사용내역 | 운결' },
  { name: 'description', content: '토큰 사용 및 충전 내역을 확인하세요.' },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UsagePage() {
  const { transactions } = useLoaderData<typeof loader>();
  const { tokenBalance: balance } = useOutletContext<DefaultLayoutContext>();

  const purchaseCount = transactions.filter((t) => t.type === 'purchase').length;
  const usageCount = transactions.filter((t) => t.type === 'usage').length;
  const totalPurchased = transactions
    .filter((t) => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalUsed = transactions
    .filter((t) => t.type === 'usage')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
        {/* 헤더 */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <div className="mb-1 flex items-center gap-2">
            <Link
              to="/tokens"
              className="text-xs text-foreground/40 transition-colors hover:text-foreground/70"
            >
              충전
            </Link>
            <span className="text-xs text-foreground/30">›</span>
            <span className="text-xs text-foreground/60">사용내역</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            📊 사용내역
          </h1>
          <p className="mt-1.5 text-sm text-foreground/50">
            토큰 충전 및 사용 기록을 확인할 수 있습니다.
          </p>
        </motion.div>

        {/* 요약 카드 */}
        <motion.div
          className="mb-8 grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: EASE }}
        >
          <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-4 text-center">
            <p className="text-xs text-foreground/40">현재 잔액</p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="text-xl font-black text-white">
                {balance.toLocaleString()}
              </span>
              <TokenIcon className="" />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4 text-center">
            <p className="text-xs text-foreground/40">총 충전</p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="text-xl font-black text-emerald-400">
                +{totalPurchased.toLocaleString()}
              </span>
              <TokenIcon className="" />
            </div>
            <p className="mt-0.5 text-xs text-foreground/30">{purchaseCount}회</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-4 text-center">
            <p className="text-xs text-foreground/40">총 사용</p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <span className="text-xl font-black text-rose-400">
                -{totalUsed.toLocaleString()}
              </span>
              <TokenIcon className="" />
            </div>
            <p className="mt-0.5 text-xs text-foreground/30">{usageCount}회</p>
          </div>
        </motion.div>

        {/* 거래 내역 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: EASE }}
        >
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-secondary/20 py-16 text-center">
              <span className="text-4xl">📭</span>
              <p className="text-sm text-foreground/40">아직 거래 내역이 없습니다.</p>
              <Link
                to="/tokens"
                className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                충전하러 가기
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  className={`flex items-center justify-between px-5 py-4 ${
                    i < transactions.length - 1 ? 'border-b border-border/50' : ''
                  }`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.03 * Math.min(i, 10),
                    duration: 0.3,
                    ease: EASE,
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
                        tx.type === 'purchase'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {tx.type === 'purchase' ? '⬆' : '⬇'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {tx.description}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {formatDate(tx.createdAt.toString())}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-bold ${
                        tx.type === 'purchase' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-foreground/40">
                      잔액 {tx.balanceAfter.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 충전 바로가기 */}
        {transactions.length > 0 && (
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Link
              to="/tokens"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <TokenIcon className="" />
              충전하러 가기
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
