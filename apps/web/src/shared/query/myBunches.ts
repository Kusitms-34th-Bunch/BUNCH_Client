import { queryOptions } from '@tanstack/react-query';
import { getMyBunches } from '../api/myBunches';
import { sharedKeys } from './keys';
import { persistedQuery } from './persistence';

/** 내 소속 번치 목록(번치 전환 시트·소속 개수 한도, 다른 화면의 번치 타입·대표 사진 찾기). 같은 key라 번치 홈에서 받은 값을 재사용 */
export const myBunchesQueryOptions = () =>
  queryOptions({
    queryKey: sharedKeys.myBunches(),
    queryFn: ({ signal }) => getMyBunches(signal),
    ...persistedQuery,
  });
