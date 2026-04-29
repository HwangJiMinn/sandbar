import { type ActionFunctionArgs, data } from 'react-router';

import { type UpdateLanguage, updateLanguageSchema } from '~/.server/schemas/language';
import { isLanguage } from '~/hooks/use-language';
import { interpolate } from '~/lib/utils';

import { InvalidException, MethodNotAllowedException } from '../lib/exceptions';
import { localizedError } from '../lib/localization';
import { handleServerError, validateFormData } from '../lib/utils';
import { getLanguageSession } from '../services/session.service';

export const languageAction = async ({ request }: ActionFunctionArgs) => {
  try {
    switch (request.method) {
      case 'POST': {
        const payload = await validateFormData<UpdateLanguage>(
          request,
          updateLanguageSchema,
        );
        if (!isLanguage(payload.language)) {
          const t = await localizedError(request);
          throw new InvalidException(
            interpolate(t.invalid, { path: t.word.language, value: payload.language }),
          );
        }
        const languageSession = await getLanguageSession(request);
        languageSession.setLanguage(payload.language);
        return data(
          { language: payload.language },
          { headers: { 'Set-Cookie': await languageSession.commit() } },
        );
      }

      default: {
        throw new MethodNotAllowedException();
      }
    }
  } catch (error) {
    return handleServerError(error);
  }
};
