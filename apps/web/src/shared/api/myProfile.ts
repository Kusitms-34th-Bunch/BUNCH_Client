import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { isSafeImageUrl } from '@/shared/lib/image/safeImageUrl';
import { CHARACTER_TYPES, defaultBunchImage } from '@/shared/lib/profile/bunchProfile';
import { bffApi, requestData } from './client/bffApi';
import { toDomainId } from './client/ids';

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
    // 사진이 없거나 안전하지 않은 주소면 null(화면이 기본 프로필 이미지를 보임)
    imageSrc: profile.imageUrl && isSafeImageUrl(profile.imageUrl) ? profile.imageUrl : null,
    bunch: profile.defaultBunch ? toMyBunch(profile.defaultBunch) : null,
  };
};

/** 서버 번치(기본 번치·번치 홈의 번치)를 내 정보의 지금 번치 모양으로(대표 이미지가 없거나 안전하지 않으면 성격별 기본 이미지) */
export const toMyBunch = (bunch: z.infer<typeof defaultBunchSchema>) => ({
  id: toDomainId(bunch.id),
  name: bunch.name,
  characterType: bunch.characterType,
  imageSrc:
    bunch.imageUrl && isSafeImageUrl(bunch.imageUrl)
      ? bunch.imageUrl
      : defaultBunchImage(bunch.characterType),
});
