import { bffApi, requestData } from '@/shared/api/bffApi';
import { bunchMembersResponseSchema, toPhotoBoxMember } from '../model/bunchMembers';

/**
 * 번치의 활성 멤버 목록(내가 속하지 않은 번치는 AUTH_002, 없는 번치는 RESOURCE_001)
 * signal은 Query가 넘겨 화면 이탈·key 변경 시 요청 취소
 */
export const getBunchMembers = async (bunchId: string, signal?: AbortSignal) => {
  const members = await requestData(
    bffApi.get(`bunches/${encodeURIComponent(bunchId)}/members`, { signal: signal ?? null }),
    bunchMembersResponseSchema,
    'bunch members',
  );
  return members.map(toPhotoBoxMember);
};
