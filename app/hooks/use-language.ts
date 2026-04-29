import { useRouteLoaderData } from 'react-router';

import { LANGUAGES } from '~/common/constants';
import type { loader } from '~/root';
import type { action } from '~/routes/apis/language';

import useEasyFetcher from './use-easy-fetcher';

// * language 검증
export const isLanguage = (language: string) =>
  LANGUAGES.map((lang) => lang.split('-')[0]).includes(language);

// * 언어 확인/변경 훅
export const useLanguage = () => {
  const { lang } = useRouteLoaderData<typeof loader>('root');
  const { fetcher, isLoading } = useEasyFetcher<typeof action>((data) => {
    if ('error' in data) {
      console.error('Language change error:', data.error.message);
    }
  });
  const setLanguage = (language: string) => {
    fetcher.submit({ language }, { method: 'post', action: '/api/language' });
  };
  return [lang, setLanguage, isLoading] as const;
};
