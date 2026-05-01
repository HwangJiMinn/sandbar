import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFetcher } from 'react-router';

// * useFetcher 간편한 사용을 위한 래핑 훅
export default function useEasyFetcher<T>(
  callback?: (data: ReturnType<typeof useFetcher<T>>['data']) => void,
  key?: string,
) {
  const fetcher = useFetcher<T>({ key });
  const callbackRef = useRef(callback);
  // render 중 ref 직접 수정 금지 → useLayoutEffect 로 동기화
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  const didCallRef = useRef(false);

  // intercept submit/load (didCallRef 리셋용)
  const wrappedFetcher = useMemo(() => {
    return {
      ...fetcher,
      submit: (...args: Parameters<typeof fetcher.submit>) => {
        didCallRef.current = false;
        fetcher.submit(...args);
      },
      load: (...args: Parameters<typeof fetcher.load>) => {
        didCallRef.current = false;
        fetcher.load(...args);
      },
    };
  }, [fetcher]);

  // idle 로 돌아왔을 때 콜백 한 번만 호출
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data != null && !didCallRef.current) {
      didCallRef.current = true;
      callbackRef.current?.(fetcher.data);
    }
  }, [fetcher.state, fetcher.data]);

  // isLoading 은 fetcher.state 에서 파생 (useState 불필요)
  return { fetcher: wrappedFetcher, isLoading: fetcher.state !== 'idle' };
}
