'use client';

import { useRouter } from 'next/navigation';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBunchHome } from '../../hooks/useBunchHome';
import { useServerBunchHome } from '../../hooks/useServerBunchHome';
import { BunchHomeError } from './BunchHomeError';
import { BunchHomeScreen } from './BunchHomeScreen';
import { NoBunchScreen } from './NoBunchScreen';

type BunchHomeProps = {
  /** server: 프로필·완성된 번들을 서버에서 받음(기본), sample: 샘플 데이터(번치 전환 등 서버가 없는 동작을 확인하는 테스트) */
  source?: 'server' | 'sample';
};

/** `/bunch` 번치 탭 화면: 상태와 동작을 가져와 화면에 연결, 참여 번치가 없으면 번치 없음(「+」·「첫 번들 만들기」는 번들 만들기 화면으로 이동, 작성 중인 번들 열기는 아직 동작 없음) */
export function BunchHome({ source = 'server' }: BunchHomeProps) {
  const router = useRouter();
  const sample = useBunchHome();
  const server = useServerBunchHome({ enabled: source === 'server' });
  const actions = sample.actions;

  if (source === 'server') {
    if (server.kind === 'loading') return <PageLoading />;
    if (server.kind === 'error') return <BunchHomeError onRetry={server.retry} />;
  }
  // 서버 모드는 내 기본 번치 하나로 보임(번치 전환·팔로우·알림·멤버 관리는 샘플이라 전환 목록은 이 번치뿐)
  const data =
    source === 'server'
      ? server.kind === 'ready'
        ? { current: server.current, bunches: [server.summary] }
        : null
      : sample.data;

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
