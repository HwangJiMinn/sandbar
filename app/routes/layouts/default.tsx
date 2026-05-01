import { useEffect, useState } from 'react';
import { data, type LoaderFunctionArgs, Outlet, useLoaderData } from 'react-router';

import { getTokenBalance } from '~/.server/controllers/token.controller';
import type { AuthSessionUser } from '~/.server/services/session.service';
import { getSessionUser } from '~/.server/services/session.service';
import { SiteFooter } from '~/components/home/site-footer';
import { SiteHeader } from '~/components/home/site-header';

// ─── Context 타입 (하위 페이지에서 useOutletContext로 사용) ──

export type DefaultLayoutContext = {
  user: AuthSessionUser | null;
  tokenBalance: number | null;
  setTokenBalance: (v: number | null) => void;
  setHideFooter: (v: boolean) => void;
};

// ─── Loader ────────────────────────────────────────────────

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getSessionUser(request);
  const tokenBalance = user ? await getTokenBalance(user.id) : null;
  return data({ user, tokenBalance });
};

// ─── Layout ────────────────────────────────────────────────

export default function DefaultLayout() {
  const { user, tokenBalance: loaderBalance } = useLoaderData<typeof loader>();
  const [tokenBalance, setTokenBalance] = useState<number | null>(loaderBalance);
  const [hideFooter, setHideFooter] = useState(false);

  // 페이지 이동 시 loader가 재실행되면 최신 잔액으로 동기화
  useEffect(() => {
    setTokenBalance(loaderBalance);
  }, [loaderBalance]);

  return (
    <>
      <SiteHeader user={user} tokenBalance={tokenBalance} />
      <Outlet
        context={
          {
            user,
            tokenBalance,
            setTokenBalance,
            setHideFooter,
          } satisfies DefaultLayoutContext
        }
      />
      {!hideFooter && <SiteFooter />}
    </>
  );
}
