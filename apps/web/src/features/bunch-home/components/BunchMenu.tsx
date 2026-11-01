'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { BUNCH_HOME_TOAST_OFFSET } from '../constants/toast';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useBunchMembers } from '../hooks/useBunchMembers';
import { useCurrentBunchId } from '../hooks/useCurrentBunchId';
import { leaveBunch } from '../hooks/useLeftBunches';
import { BunchMenuScreen } from './BunchMenuScreen';

/**
 * `/bunch/menu` 더보기 메뉴: 번치·역할 API 연결 전이라 번치 홈에서 고른 fixture 번치의 이름·역할 사용
 * 나가기: 남은 번치로 바꿔 번치 탭으로 가고 토스트(남은 번치가 없으면 번치 없음), 서버 요청은 API 연결 때
 */
export function BunchMenu() {
  const router = useRouter();
  const [currentId, setCurrentId] = useCurrentBunchId();
  // 첫 hydration은 저장된 번치를 몰라 역할별 메뉴를 그리지 않음(다른 역할의 메뉴가 잠깐 보이지 않게)
  const bunch =
    currentId === null ? undefined : (bunchDetailsFixture[currentId] ?? initialBunchDetailFixture);
  // 멤버 관리에서 메인 관리자를 넘기면 바뀐 역할로 메뉴를 그림
  const { members, myRole } = useBunchMembers(bunch?.id);
  const home = () => router.replace(BUNCH_HOME_PATHS.home);

  return (
    <BunchMenuScreen
      bunchName={bunch?.name}
      // 멤버를 알기 전에는 메뉴를 그리지 않음(나만 남은 번치 판정이 늦어 다른 나가기 흐름으로 가지 않게)
      myRole={members ? (myRole ?? bunch?.myRole) : undefined}
      // 직접 진입이라 돌아갈 기록이 없으면 번치 홈으로 이동
      onBack={() => (window.history.length > 1 ? router.back() : home())}
      alone={members?.length === 1}
      onLeave={() => {
        if (!bunch) return;
        const next = leaveBunch(bunch.id);
        if (next) setCurrentId(next);
        // 들어온 길(번치 탭 → 메뉴)을 되돌아가 나간 번치 메뉴를 뒤로 가기 대상에서 뺌(앞으로 가기에는 남음). 직접 진입이면 replace
        if (window.history.length > 1) router.back();
        else home();
        toast(BUNCH_HOME_MESSAGES.left(bunch.name), {
          fullWidth: true,
          bottomOffset: BUNCH_HOME_TOAST_OFFSET,
        });
      }}
      onOwnerLeave={() => router.push(BUNCH_HOME_PATHS.leave)}
    />
  );
}
