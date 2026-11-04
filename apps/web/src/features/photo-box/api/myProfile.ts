import { bffApi, requestData } from '@/shared/api/bffApi';
import { toDomainId } from '@/shared/api/ids';
import { DEFAULT_BUNCH_IMAGE } from '@/shared/lib/bunchProfile';
import { myProfileSchema } from '../model/myProfile';

/** 내 프로필과 기본 번치(대표 이미지가 없으면 기본 번치 이미지). 기본 번치가 없으면 bunch는 null */
export const getMyProfile = async (signal?: AbortSignal) => {
  const profile = await requestData(
    bffApi.get('members/me', { signal: signal ?? null }),
    myProfileSchema,
    'my profile',
  );
  return {
    memberId: toDomainId(profile.memberId),
    bunch: profile.defaultBunch
      ? {
          id: toDomainId(profile.defaultBunch.id),
          name: profile.defaultBunch.name,
          imageSrc: profile.defaultBunch.imageUrl || DEFAULT_BUNCH_IMAGE,
        }
      : null,
  };
};
