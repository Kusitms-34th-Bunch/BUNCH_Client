import { bffApi, requestData } from '@/shared/api/bffApi';
import { bunchMembersResponseSchema, toPhotoBoxMember } from '../model/bunchMembers';

/** 번치의 활성 멤버 목록(내가 속하지 않은 번치는 AUTH_002, 없는 번치는 RESOURCE_001) */
export const getBunchMembers = async (bunchId: string) => {
  const members = await requestData(
    bffApi.get(`bunches/${encodeURIComponent(bunchId)}/members`),
    bunchMembersResponseSchema,
    'bunch members',
  );
  return members.map(toPhotoBoxMember);
};
