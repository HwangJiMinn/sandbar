import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';

import {
  InvalidException,
  MethodNotAllowedException,
  UnauthorizedException,
} from '~/.server/lib/exceptions';
import { handleServerError } from '~/.server/lib/utils';
import { SavedSaju } from '~/.server/models/saved-saju.model';
import { getSessionUser } from '~/.server/services/session.service';
import type { ProfileCreateRequest } from '~/lib/saved-saju-types';

// ─── 프로필 목록 조회 (Loader) ──────────────────────────────

export async function profileLoader({ request }: LoaderFunctionArgs) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      throw new UnauthorizedException();
    }

    const profiles = await SavedSaju.find({ userId: sessionUser.id })
      .sort({ createdAt: -1 })
      .lean();

    const serialized = profiles.map((p) => ({
      _id: String(p._id),
      userId: String(p.userId),
      label: p.label,
      name: p.name,
      gender: p.gender,
      year: p.year,
      month: p.month,
      day: p.day,
      hour: p.hour ?? null,
      createdAt: p.createdAt.toISOString(),
    }));

    return data({ profiles: serialized });
  } catch (err) {
    return handleServerError(err);
  }
}

// ─── 프로필 생성 / 삭제 (Action) ───────────────────────────

export async function profileAction({ request }: ActionFunctionArgs) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) throw new UnauthorizedException();

    const method = request.method.toUpperCase();

    // ── 프로필 생성 (POST) ──
    if (method === 'POST') {
      const body = (await request.json()) as ProfileCreateRequest;

      const { label, name, gender, year, month, day, hour } = body;
      if (!label || !name || !gender || !year || !month || !day) {
        throw new InvalidException('필수 정보가 누락되었습니다.');
      }
      if (!['남', '여'].includes(gender)) {
        throw new InvalidException('성별이 올바르지 않습니다.');
      }

      // 최대 10개 제한
      const count = await SavedSaju.countDocuments({ userId: sessionUser.id });
      if (count >= 10) {
        throw new InvalidException('사주 프로필은 최대 10개까지 저장할 수 있습니다.');
      }

      const profile = await SavedSaju.create({
        userId: sessionUser.id,
        label: label.trim(),
        name: name.trim(),
        gender,
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: hour != null ? Number(hour) : null,
      });

      return data({
        profile: {
          _id: String(profile._id),
          userId: String(profile.userId),
          label: profile.label,
          name: profile.name,
          gender: profile.gender,
          year: profile.year,
          month: profile.month,
          day: profile.day,
          hour: profile.hour ?? null,
          createdAt: profile.createdAt.toISOString(),
        },
      });
    }

    // ── 프로필 삭제 (DELETE) ──
    if (method === 'DELETE') {
      const body = (await request.json()) as { id: string };
      if (!body.id) throw new InvalidException('삭제할 프로필 ID가 없습니다.');

      const result = await SavedSaju.findOneAndDelete({
        _id: body.id,
        userId: sessionUser.id, // 본인 소유 확인
      });

      if (!result) throw new InvalidException('프로필을 찾을 수 없습니다.');

      return data({ success: true });
    }

    throw new MethodNotAllowedException();
  } catch (err) {
    return handleServerError(err);
  }
}
