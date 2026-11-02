import { useSyncExternalStore } from 'react';
import { useBlockedBunches } from './useBlockedBunches';
import { useBunchHome } from './useBunchHome';
import { useCurrentBunchId } from './useCurrentBunchId';

const subscribeNothing = () => () => {};

/**
 * 지금 내 번치와 다른 번치의 차단 관계. 서버 렌더·첫 hydration은 저장된 내 번치를 몰라 checking(내용을 그리지 않음)
 * 차단 API 연결 전이라 내가 차단한 경우만 알 수 있음(상대가 나를 차단한 경우와 서버 쪽 차단은 API 연결 때)
 */
export function useBlockRelation(bunchId: string) {
  const [storedId] = useCurrentBunchId();
  const { data } = useBunchHome();
  const me = storedId === null ? undefined : data?.current;
  const { blocked, block } = useBlockedBunches(me?.id);
  // 서버·첫 hydration은 false, 이후 true(참여 번치가 없으면 차단 관계도 없으니 그대로 그림)
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  return {
    /** 차단 여부를 아직 모름(서버 렌더·첫 hydration) */
    checking: !hydrated,
    /** 지금 내 번치(이름·역할). 모르면 undefined */
    me,
    isBlocked: blocked?.some((bunch) => bunch.id === bunchId) ?? false,
    block,
  };
}
