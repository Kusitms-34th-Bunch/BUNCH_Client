'use client';

import { useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBunchHome } from '../../hooks/useBunchHome';
import { BunchHomeScreen } from './BunchHomeScreen';
import { NoBunchScreen } from './NoBunchScreen';

/** `/bunch` 번치 탭 화면: 상태와 동작을 가져와 화면에 연결, 참여 번치가 없으면 번치 없음(「+」·「첫 번들 만들기」는 번들 만들기 화면으로 이동, 작성 중인 번들 열기는 아직 동작 없음) */
export function BunchHome() {
  const router = useRouter();
  const { data, actions } = useBunchHome();

  if (!data) {
    return (
      <NoBunchScreen
        onCreateBunch={() => router.push(BUNCH_HOME_PATHS.createBunch)}
        onJoinBunch={() => router.push(BUNCH_HOME_PATHS.joinBunch)}
      />
    );
  }
  return (
    <BunchHomeScreen
      data={data}
      actions={actions}
      onAddBunch={() => router.push(BUNCH_HOME_PATHS.startBunch)}
      onCreateBundle={() => router.push(BUNCH_HOME_PATHS.createBundle)}
    />
  );
}
