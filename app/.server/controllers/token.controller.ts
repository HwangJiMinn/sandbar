import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';

import {
  InvalidException,
  MethodNotAllowedException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { handleServerError } from '~/.server/lib/utils';
import { TokenTransaction } from '~/.server/models/token-transaction.model';
import { User } from '~/.server/models/user.model';
import { getSessionUser } from '~/.server/services/session.service';
import { TOKEN_COST_SAJU_AI } from '~/lib/token-constants';

// ─── 상수 re-export (하위 호환) ───────────────────────────
export { TOKEN_COST_SAJU_AI };

export const TOKEN_PACKAGES = [
  { id: 'pack_1000', tokens: 1_000, price: 1_000, label: '기본 패키지', badge: null },
  { id: 'pack_5000', tokens: 5_000, price: 5_000, label: '인기 패키지', badge: '인기' },
  {
    id: 'pack_10000',
    tokens: 10_000,
    price: 10_000,
    label: '스탠다드 패키지',
    badge: null,
  },
  {
    id: 'pack_50000',
    tokens: 50_000,
    price: 50_000,
    label: '프리미엄 패키지',
    badge: '추천',
  },
] as const;

export type TokenPackageId = (typeof TOKEN_PACKAGES)[number]['id'];

// ─── 잔액 조회 ─────────────────────────────────────────────

export const getTokenBalance = async (userId: string): Promise<number> => {
  const user = await User.findById(userId).select('tokenBalance').lean();
  return (user?.tokenBalance as number | undefined) ?? 0;
};

// ─── 토큰 사용 (원자적 업데이트) ──────────────────────────

export const deductTokens = async (
  userId: string,
  amount: number,
  description: string,
): Promise<{ success: boolean; balanceAfter: number; error?: string }> => {
  // findOneAndUpdate로 원자적 차감 (동시 요청 방어)
  const updated = await User.findOneAndUpdate(
    { _id: userId, tokenBalance: { $gte: amount } }, // 잔액 충분할 때만
    { $inc: { tokenBalance: -amount } },
    { new: true, select: 'tokenBalance' },
  ).lean();

  if (!updated) {
    return { success: false, balanceAfter: 0, error: '토큰이 부족합니다.' };
  }

  const balanceAfter = updated.tokenBalance as number;

  await TokenTransaction.create({
    userId,
    amount: -amount,
    type: 'usage',
    description,
    balanceAfter,
  });

  return { success: true, balanceAfter };
};

// ─── 토큰 충전 ─────────────────────────────────────────────

export const addTokens = async (
  userId: string,
  amount: number,
  description: string,
): Promise<number> => {
  const updated = await User.findByIdAndUpdate(
    userId,
    { $inc: { tokenBalance: amount } },
    { new: true, select: 'tokenBalance' },
  ).lean();

  const balanceAfter = (updated?.tokenBalance as number | undefined) ?? 0;

  await TokenTransaction.create({
    userId,
    amount,
    type: 'purchase',
    description,
    balanceAfter,
  });

  return balanceAfter;
};

// ─── Loader: 잔액 + 거래 내역 ─────────────────────────────

export const tokenLoader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException();

    const [balance, transactions] = await Promise.all([
      getTokenBalance(user.id),
      TokenTransaction.find({ userId: user.id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    return data({
      balance,
      transactions: transactions.map((t) => ({
        id: String(t._id),
        amount: t.amount,
        type: t.type,
        description: t.description,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
      })),
      packages: TOKEN_PACKAGES,
    });
  } catch (error) {
    return handleServerError(error);
  }
};

// ─── Action: 토큰 구매 ────────────────────────────────────

export const tokenAction = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== 'POST') throw new MethodNotAllowedException();

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException();

    const body = (await request.json()) as { packageId: string };
    const pkg = TOKEN_PACKAGES.find((p) => p.id === body.packageId);
    if (!pkg) throw new InvalidException('존재하지 않는 패키지입니다.');

    // ⚠️ 실제 결제 로직은 여기에 통합 (현재는 즉시 지급)
    const balanceAfter = await addTokens(
      user.id,
      pkg.tokens,
      `${pkg.label} 구매 (${pkg.tokens.toLocaleString()}토큰)`,
    );

    return data({ success: true, balanceAfter, added: pkg.tokens });
  } catch (error) {
    return handleServerError(error);
  }
};
