import { z } from 'zod';
import { bffApi, requestData } from '@/shared/api/bffApi';

/** 공개 초대 카드 조회 응답. 이 화면은 링크가 유효한지만 알면 돼 내용은 쓰지 않고 계약 필수 필드(`name`·`introduction`·`code`)만 검사함(카드 내용은 초대 확인 화면이 로그인 뒤 확인 API로 받음) */
const publicInvitationSchema = z.object({
  name: z.string(),
  introduction: z.string(),
  code: z.string(),
  // OpenAPI는 non-null, Notion 명세는 null 가능(초대한 사람이 비활성이면 null)이라 둘 다 받음
  imageUrl: z.string().nullish(),
  inviterNickname: z.string().nullish(),
});

/**
 * 초대 링크가 유효한지 확인(`GET /invitations/{token}`, 공개 API라 로그인 불필요)
 * 없거나 만료·폐기된 링크는 404 `INVITE_001`(구분하지 않음). 실패는 `ApiError`로 던짐
 * 토큰은 경로 조각으로 인코딩해 보내고 로그·오류 메시지에는 넣지 않음
 */
export const lookupInvitation = async (token: string, signal?: AbortSignal) => {
  await requestData(
    bffApi.get(`invitations/${encodeURIComponent(token)}`, { signal: signal ?? null }),
    publicInvitationSchema,
    'public invitation',
  );
};
