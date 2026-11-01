'use client';

import { useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { useBunchHome } from '../hooks/useBunchHome';
import { BunchHomeScreen } from './BunchHomeScreen';

/** `/bunch` 번치 탭 화면: 상태와 동작을 가져와 화면에 연결(번들 만들기·작성 중인 번들 열기는 아직 동작 없음) */
export function BunchHome() {
  const router = useRouter();
  const { data, actions } = useBunchHome();

  return (
    <BunchHomeScreen
      data={data}
      actions={actions}
      onAddBunch={() => router.push(BUNCH_HOME_PATHS.startBunch)}
    />
  );
}
