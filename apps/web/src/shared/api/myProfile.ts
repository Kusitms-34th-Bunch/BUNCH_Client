import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { CHARACTER_TYPES, defaultProfileImage } from '@/shared/lib/bunchProfile';
import { bffApi, requestData } from './bffApi';
import { toDomainId } from './ids';

const defaultBunchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  characterType: z.enum(CHARACTER_TYPES),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['BunchResponse']>>;

/** `GET /api/v1/members/me` 응답. 누구인지와 기본 번치만 씀 */
const myProfileSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
  birthYear: z.number().int().nullish(),
  gender: z.enum(['FEMALE', 'MALE']).nullish(),
  defaultBunch: defaultBunchSchema.nullish(),
}) satisfies z.ZodType<
  // 중첩 객체는 계약 검사가 선택 필드를 다루지 못해 defaultBunch는 위 스키마에서 따로 검사
  Omit<ApiContract<components['schemas']['MemberResponse']>, 'defaultBunch'> & {
    defaultBunch?: unknown;
  }
>;

/** 내 프로필과 기본 번치(대표 이미지가 없으면 성격별 기본 이미지). 기본 번치가 없으면 bunch는 null */
export const getMyProfile = async (signal?: AbortSignal) => {
  const profile = await requestData(
    bffApi.get('members/me', { signal: signal ?? null }),
    myProfileSchema,
    'my profile',
  );
  return {
    memberId: toDomainId(profile.memberId),
    nickname: profile.nickname ?? null,
    imageSrc: profile.imageUrl ?? null,
    bunch: profile.defaultBunch
      ? {
          id: toDomainId(profile.defaultBunch.id),
          name: profile.defaultBunch.name,
          characterType: profile.defaultBunch.characterType,
          imageSrc:
            profile.defaultBunch.imageUrl ||
            defaultProfileImage(profile.defaultBunch.characterType),
        }
      : null,
  };
};
