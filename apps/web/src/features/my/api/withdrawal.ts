import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { toDomainId } from '@/shared/api/ids';
import { clearPendingInvitation } from '@/shared/lib/pendingInvitation';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';

const ownerBunchSchema = z.object({
  bunchId: z.number().int().positive(),
  name: z.string(),
  imageUrl: z.string().nullish(),
  myMembershipId: z.number().int().positive(),
  membershipVersion: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<components['schemas']['WithdrawalOwnerBunch']>>;

const withdrawalCheckSchema = z.object({
  ownerBunches: z.array(ownerBunchSchema),
  // 가입한 소셜 서비스. Apple이면 탈퇴 전에 Apple 재인증 코드를 함께 보냄
  // 외부 계정 중 첫 번째의 서비스. 없으면 서버가 null(`MemberWithdrawalService.check`)
  provider: z.enum(['APPLE', 'GOOGLE', 'KAKAO']).nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['WithdrawalCheckResponse']>>;

// 되돌릴 수 없는 요청이라 본문 모양이 달라도 성공 응답이면 탈퇴된 것으로 봄
const withdrawalResultSchema = z.unknown();

/** 내가 메인 관리자인 번치(id는 번치 ID). 넘길 멤버가 있는지는 번치별 멤버 목록으로 따로 확인 */
export type WithdrawalOwnerBunch = { id: string; name: string; imageSrc: string | undefined };

/** 탈퇴 전 확인 결과: 내가 메인 관리자인 번치와 가입한 소셜 서비스 */
export type WithdrawalCheck = {
  ownerBunches: WithdrawalOwnerBunch[];
  provider: 'APPLE' | 'GOOGLE' | 'KAKAO' | undefined;
};

/** 탈퇴 전 확인(`GET /api/v1/members/me/withdrawal/check`): 내가 메인 관리자인 번치와 가입한 소셜 서비스 */
export const getWithdrawalCheck = async (signal?: AbortSignal): Promise<WithdrawalCheck> => {
  const { ownerBunches, provider } = await requestData(
    bffApi.get('members/me/withdrawal/check', { signal: signal ?? null }),
    withdrawalCheckSchema,
    'withdrawal check',
  );
  return {
    ownerBunches: ownerBunches.map((bunch) => ({
      id: toDomainId(bunch.bunchId),
      name: bunch.name,
      // 대표 사진이 없으면 비움. 응답에 번치 타입이 없어 기본 이미지는 소속 번치 목록으로 고름(queries/withdrawal.ts)
      imageSrc: bunch.imageUrl && isSafeImageUrl(bunch.imageUrl) ? bunch.imageUrl : undefined,
    })),
    provider: provider ?? undefined,
  };
};

/**
 * 회원 탈퇴(`POST /api/v1/members/me/withdrawal`). 서버가 모든 기기 로그인·푸시 토큰을 해제함(기능명세서 7.6.4)
 * Apple 가입자는 재인증 코드(`appleAuthorizationCode`)로 서버가 Apple 연결을 먼저 끊고, 실패하면(503 `USER_007`) 탈퇴하지 않음
 * 성공 뒤 이 기기의 인증 쿠키를 BFF 로그아웃으로 지움. 계정이 이미 없어 백엔드 폐기가 실패해도 BFF는 쿠키를 지우므로 그 실패는 탈퇴 실패로 보지 않음
 */
export const withdraw = async (appleAuthorizationCode?: string) => {
  await requestData(
    bffApi.post(
      'members/me/withdrawal',
      // Apple 가입자만 재인증 코드를 보내 서버가 Apple 연결을 끊음(없으면 서버가 USER_006으로 거절)
      appleAuthorizationCode
        ? { json: { appleAuthorizationCode } satisfies components['schemas']['WithdrawalRequest'] }
        : {},
    ),
    withdrawalResultSchema,
    'withdrawal',
  );
  // 보관 중인 초대 정보도 로그아웃과 같이 지움(기능명세 1.5.1)
  clearPendingInvitation();
  await bffApi.post('auth/logout').catch(() => undefined);
};
