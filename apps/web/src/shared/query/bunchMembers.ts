import { queryOptions, skipToken } from '@tanstack/react-query';
import { getBunchMembers } from '../api/bunchMembers';
import { sharedKeys } from './keys';
import { persistedQuery } from './persistence';

/**
 * 내 번치 멤버 목록. 번치를 아직 모르면 요청하지 않음(skipToken)
 * 다른 번치에는 쓰지 않음: key에 명의가 없고 기기에 저장돼 명의가 바뀌어도 남음(다른 번치는 `bunchHomeKeys.otherBunchMembers`)
 */
export const bunchMembersQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: sharedKeys.bunchMembers(bunchId),
    queryFn: bunchId ? ({ signal }) => getBunchMembers(bunchId, signal) : skipToken,
    ...persistedQuery,
  });
