'use client';

import { useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useCurrentBunchId } from '../hooks/useCurrentBunchId';
import { BunchMenuScreen } from './BunchMenuScreen';

/**
 * `/bunch/menu` 더보기 메뉴: 번치·역할 API 연결 전이라 번치 홈에서 고른 fixture 번치의 이름·역할 사용
 * 나가기는 번치 홈으로 돌아가기만 함(서버 요청·이동 대상·토스트는 번치 나가기 이슈)
 */
export function BunchMenu() {
  const router = useRouter();
  const [currentId] = useCurrentBunchId();
  const bunch = bunchDetailsFixture[currentId] ?? initialBunchDetailFixture;
  const home = () => router.replace(BUNCH_HOME_PATHS.home);

  return (
    <BunchMenuScreen
      bunchName={bunch.name}
      myRole={bunch.myRole}
      // 직접 진입이라 돌아갈 기록이 없으면 번치 홈으로 이동
      onBack={() => (window.history.length > 1 ? router.back() : home())}
      onLeave={home}
    />
  );
}
