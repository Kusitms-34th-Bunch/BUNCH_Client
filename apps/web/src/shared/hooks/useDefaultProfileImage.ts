import { useQuery } from '@tanstack/react-query';
import { defaultProfileImage } from '../lib/bunchProfile';
import { myProfileQueryOptions } from '../query/myProfile';

/**
 * 사진이 없는 내 프로필에 보일 기본 이미지: 지금 있는 번치(내 기본 번치)의 타입에 맞춤
 * 가입한 번치가 없거나 아직 모르면 타입 1
 */
export function useDefaultProfileImage() {
  const { data } = useQuery(myProfileQueryOptions());
  return defaultProfileImage(data?.bunch?.characterType);
}
