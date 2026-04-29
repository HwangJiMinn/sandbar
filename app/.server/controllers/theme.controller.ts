import type { ActionFunctionArgs } from 'react-router';

import { Theme } from '~/common/constants';
import { isTheme } from '~/hooks/use-theme';
import { interpolate } from '~/lib/utils';

import { InvalidException, MethodNotAllowedException } from '../lib/exceptions';
import { localizedError } from '../lib/localization';
import { handleServerError } from '../lib/utils';
import { getThemeSession } from '../services/session.service';

export const themeAction = async ({ request }: ActionFunctionArgs) => {
  try {
    switch (request.method) {
      case 'POST': {
        const { theme } = (await request.json()) as { theme: Theme };
        if (!isTheme(theme)) {
          const t = await localizedError(request);
          throw new InvalidException(
            interpolate(t.invalid, { path: t.word.theme, value: theme }),
          );
        }
        const themeSession = await getThemeSession(request);
        themeSession.setTheme(theme);
        return new Response(null, {
          status: 204,
          headers: { 'Set-Cookie': await themeSession.commit() },
        });
      }

      default: {
        throw new MethodNotAllowedException();
      }
    }
  } catch (error) {
    return handleServerError(error);
  }
};
