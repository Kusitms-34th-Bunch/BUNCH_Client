import { z } from 'zod';
import { CHARACTER_TYPES } from '@/shared/lib/bunchProfile';
import { bffApi, requestData } from './bffApi';

/**
 * `GET /api/v1/members/me/bunches` 응답(Swagger `MyBunchesResponse`)
 * 번치 전환 목록(번치 홈)과 내 번치의 타입·대표 사진 찾기(탈퇴 관리자 넘기기 등)가 함께 씀
 * 생성 타입을 다시 만들면 번들 스키마 계약 차이가 함께 드러나 그 정리 전까지 직접 정의하고 쓰는 필드만 검사
 */
// 계약 미연결: 번치 전환 목록에 필요한 필드만 받음(소속 myMembership 생략)
export const myBunchesResponseSchema = z.object({
  activeCount: z.number().int().nonnegative(),
  maxActiveCount: z.number().int().positive(),
  defaultBunchId: z.number().int().positive().nullish(),
  activeBunches: z.array(
    z.object({
      bunch: z.object({
        id: z.number().int().positive(),
        name: z.string(),
        imageUrl: z.string().nullish(),
        characterType: z.enum(CHARACTER_TYPES),
      }),
      unreadCount: z.number().int().nonnegative(),
      lastUsedAt: z.string(),
    }),
  ),
  unavailableBunches: z.array(
    z.object({
      id: z.number().int().positive(),
      bunchId: z.number().int().positive(),
      name: z.string(),
      characterType: z.enum(CHARACTER_TYPES),
      reason: z.enum(['REMOVED', 'DELETED']),
    }),
  ),
});

export type MyBunches = z.infer<typeof myBunchesResponseSchema>;

/** 내 소속 번치(번치 전환 목록)와 접근 불가 번치 안내 */
export const getMyBunches = (signal?: AbortSignal) =>
  requestData(
    bffApi.get('members/me/bunches', { signal: signal ?? null }),
    myBunchesResponseSchema,
    'my bunches',
  );
