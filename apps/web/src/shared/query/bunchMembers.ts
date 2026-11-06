import { queryOptions, skipToken } from '@tanstack/react-query';
import { getBunchMembers } from '../api/bunchMembers';
import { sharedKeys } from './keys';

/** 번치 멤버 목록. 번치를 아직 모르면 요청하지 않음(skipToken) */
export const bunchMembersQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.bunchMembers(bunchId),
    queryFn: bunchId ? ({ signal }) => getBunchMembers(bunchId, signal) : skipToken,
  });
