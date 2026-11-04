import { queryOptions } from '@tanstack/react-query';
import { getMyProfile } from '../api/myProfile';
import { sharedKeys } from './keys';

/** 내 프로필과 기본 번치(어느 번치의 화면을 볼지 정함) */
export const myProfileQueryOptions = () =>
  queryOptions({
    queryKey: sharedKeys.me(),
    queryFn: ({ signal }) => getMyProfile(signal),
  });
