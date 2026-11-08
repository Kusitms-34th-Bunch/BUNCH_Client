import { queryOptions, skipToken } from '@tanstack/react-query';
import type { CharacterType } from '../lib/bunchProfile';
import { getBunchMembers } from '../api/bunchMembers';
import { sharedKeys } from './keys';

/** 번치 멤버 목록. 번치를 아직 모르면 요청하지 않음(skipToken). 번치 타입은 바뀌지 않아 key에 넣지 않음 */
export const bunchMembersQueryOptions = (
  bunchId: string | undefined,
  characterType?: CharacterType,
) =>
  // 번치 타입은 번치마다 정해져 바뀌지 않으므로 key에 넣지 않음(넣으면 번치 key로 하는 무효화가 어긋남)
  // 전제: bunchId와 타입을 같은 응답(members/me 기본 번치)에서 받음. 다른 출처의 bunchId로 부르면 타입 1이 캐시에 남을 수 있음
  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- characterType은 bunchId가 정함
  queryOptions({
    queryKey: sharedKeys.bunchMembers(bunchId),
    queryFn: bunchId ? ({ signal }) => getBunchMembers(bunchId, signal, characterType) : skipToken,
  });
