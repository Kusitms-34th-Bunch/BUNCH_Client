import { queryOptions, skipToken } from '@tanstack/react-query';
import { getBunchMembers } from '../api/bunchMembers';
import { photoBoxKeys } from './keys';

/**
 * 번치 멤버 목록. 번치를 아직 모르면 요청하지 않음(skipToken)
 * 다른 feature가 쓰게 되면 `src/shared/query`로 승격(docs/architecture/data-layer.md)
 */
export const bunchMembersQueryOptions = (bunchId: string | undefined) =>
  queryOptions({
    queryKey: photoBoxKeys.members(bunchId),
    queryFn: bunchId ? () => getBunchMembers(bunchId) : skipToken,
  });
