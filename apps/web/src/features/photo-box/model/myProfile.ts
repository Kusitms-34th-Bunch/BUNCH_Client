import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';

const defaultBunchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  characterType: z.enum(['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4']),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['BunchResponse']>>;

/** `GET /api/v1/members/me` 응답. 사진함은 누구인지와 기본 번치만 씀 */
export const myProfileSchema = z.object({
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
