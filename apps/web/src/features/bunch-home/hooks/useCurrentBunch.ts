import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useBunchMembers } from './useBunchMembers';
import { useCurrentBunchId } from './useCurrentBunchId';

/**
 * 지금 번치(API 연결 전 fixture)와 멤버·내 역할. 첫 hydration은 저장된 번치를 몰라 `bunch`가 undefined
 * 역할은 멤버 관리에서 바뀐 값 우선. `pinnedId`가 있으면 지금 번치 대신 그 번치(삭제 뒤 화면이 빠지는 동안 등)
 */
export function useCurrentBunch(pinnedId?: string | null) {
  const [currentId, setCurrentId] = useCurrentBunchId();
  const bunchId = pinnedId ?? currentId;
  const bunch =
    bunchId === null ? undefined : (bunchDetailsFixture[bunchId] ?? initialBunchDetailFixture);
  const { members, myRole, actions } = useBunchMembers(bunch?.id);
  return { bunch, setCurrentId, members, actions, myRole: myRole ?? bunch?.myRole };
}
