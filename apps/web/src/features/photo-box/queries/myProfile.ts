import { queryOptions } from '@tanstack/react-query';
import { getMyProfile } from '../api/myProfile';
import { photoBoxKeys } from './keys';

/**
 * 내 프로필과 기본 번치(어느 번치의 사진함을 볼지 정함)
 * 다른 feature가 쓰게 되면 `src/shared/query`로 승격(docs/architecture/data-layer.md)
 */
export const myProfileQueryOptions = () =>
  queryOptions({
    queryKey: photoBoxKeys.me(),
    queryFn: ({ signal }) => getMyProfile(signal),
  });
