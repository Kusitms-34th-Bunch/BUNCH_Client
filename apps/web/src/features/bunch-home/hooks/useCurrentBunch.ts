import { useMemo } from 'react';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useBunchMembers } from './useBunchMembers';
import { useCurrentBunchId } from './useCurrentBunchId';

/**
 * 지금 번치(API 연결 전 fixture)와 멤버·내 역할. 첫 hydration은 저장된 번치를 몰라 `bunch`가 undefined
 * 역할은 멤버 관리에서 바뀐 값 우선
 */
export function useCurrentBunch() {
  const [bunchId, setCurrentId] = useCurrentBunchId();
  const bunch =
    bunchId === null ? undefined : (bunchDetailsFixture[bunchId] ?? initialBunchDetailFixture);
  const { members: rawMembers, myRole, actions } = useBunchMembers(bunch?.id);
  // 프로필 사진이 없는 멤버는 기본 프로필 이미지(실제 API는 members 응답에서 같은 규칙으로 채움)
  const members = useMemo(
    () =>
      rawMembers?.map((member) => ({
        ...member,
        imageSrc: member.imageSrc ?? DEFAULT_PROFILE_IMAGE,
      })),
    [rawMembers],
  );
  return { bunch, setCurrentId, members, actions, myRole: myRole ?? bunch?.myRole };
}
