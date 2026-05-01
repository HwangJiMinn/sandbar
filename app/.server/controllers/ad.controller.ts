import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';

import {
  InvalidException,
  MethodNotAllowedException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { handleServerError } from '~/.server/lib/utils';
import { AdCredit } from '~/.server/models/ad-credit.model';
import { getSessionUser } from '~/.server/services/session.service';
import { AD_CREDIT_MS, AD_REWATCH_THRESHOLD_MS } from '~/lib/token-constants';

// ─── 크레딧 활성 여부 확인 유틸 (다른 컨트롤러에서 재사용) ──

export async function hasAdCredit(userId: string): Promise<boolean> {
  const credit = await AdCredit.findOne({
    userId,
    expiresAt: { $gt: new Date() },
  }).lean();
  return !!credit;
}

export async function getAdCreditExpiresAt(userId: string): Promise<Date | null> {
  const credit = await AdCredit.findOne({
    userId,
    expiresAt: { $gt: new Date() },
  })
    .select('expiresAt')
    .lean();
  return credit ? credit.expiresAt : null;
}

// ─── Loader: 현재 크레딧 상태 조회 ────────────────────────

export async function adCreditLoader({ request }: LoaderFunctionArgs) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return data({
        expiresAt: null,
        canWatch: true,
        totalAdsWatched: 0,
      });
    }

    const credit = await AdCredit.findOne({ userId: user.id }).lean();
    const now = new Date();
    const isActive = !!credit && credit.expiresAt > now;
    const expiresAt = isActive ? credit!.expiresAt.toISOString() : null;
    const remainingMs = isActive ? credit!.expiresAt.getTime() - now.getTime() : 0;

    // 크레딧이 없거나 남은 시간이 threshold 이하일 때만 재시청 허용
    const canWatch = !isActive || remainingMs <= AD_REWATCH_THRESHOLD_MS;

    return data({
      expiresAt,
      canWatch,
      totalAdsWatched: credit?.totalAdsWatched ?? 0,
    });
  } catch (err) {
    return handleServerError(err);
  }
}

// ─── Action: 광고 시청 완료 → 크레딧 지급 ─────────────────

export async function adCreditAction({ request }: ActionFunctionArgs) {
  try {
    if (request.method.toUpperCase() !== 'POST') {
      throw new MethodNotAllowedException();
    }

    const user = await getSessionUser(request);
    if (!user) throw new UnauthorizedException('로그인이 필요합니다.');

    const now = new Date();

    // 도배 방지: 남은 크레딧이 threshold 초과이면 거부
    const existing = await AdCredit.findOne({ userId: user.id }).lean();
    if (existing && existing.expiresAt > now) {
      const remainingMs = existing.expiresAt.getTime() - now.getTime();
      if (remainingMs > AD_REWATCH_THRESHOLD_MS) {
        const remainingMin = Math.ceil(remainingMs / 60_000);
        throw new InvalidException(
          `아직 ${remainingMin}분의 무료 이용권이 남아있습니다.`,
        );
      }
    }

    const expiresAt = new Date(now.getTime() + AD_CREDIT_MS);

    await AdCredit.findOneAndUpdate(
      { userId: user.id },
      {
        expiresAt,
        lastWatchedAt: now,
        $inc: { totalAdsWatched: 1 },
      },
      { upsert: true, new: true },
    );

    return data({ expiresAt: expiresAt.toISOString() });
  } catch (err) {
    return handleServerError(err);
  }
}
