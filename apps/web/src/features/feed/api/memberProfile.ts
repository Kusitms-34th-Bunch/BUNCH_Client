import { bffApi, requestData } from '@/shared/api/client/bffApi';
import { memberSocialProfileSchema } from '../model/memberProfile';

/** 멤버 프로필(명세 020). 참여 번치와 팔로우 상태는 지금 번치 기준, 차단 관계 번치는 서버가 뺌 */
export const getMemberSocialProfile = (memberId: string, signal?: AbortSignal) =>
  requestData(
    bffApi.get(`members/${encodeURIComponent(memberId)}/social-profile`, {
      signal: signal ?? null,
    }),
    memberSocialProfileSchema,
    'member social profile',
  );
