import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';

// * useFetcher 간편한 사용을 위한 래핑 훅
export default function useEasyFetcher<T>(
  callback?: (data: ReturnType<typeof useFetcher<T>>['data']) => void,
  key?: string,
) {
  const fetcher = useFetcher<T>({ key });
  const [isLoading, setIsLoading] = useState(false);

  // intercept submit/load
  const wrappedFetcher = useMemo(() => {
    return {
      ...fetcher,
      submit: (...args: Parameters<typeof fetcher.submit>) => {
        setIsLoading(true);
        fetcher.submit(...args);
      },
      load: (...args: Parameters<typeof fetcher.load>) => {
        setIsLoading(true);
        fetcher.load(...args);
      },
    };
  }, [fetcher]);

  useEffect(() => {
    if (isLoading && fetcher.state === 'idle') {
      setIsLoading(false);
    }
    if (fetcher.state === 'idle' && fetcher.data && callback) {
      callback(fetcher.data);
      fetcher.data = null; // reset data after callback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data, isLoading, callback]);

  return { fetcher: wrappedFetcher, isLoading };
}
