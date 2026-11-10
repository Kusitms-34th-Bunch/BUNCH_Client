'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { LOGIN_PATH } from '../../constants/paths';
import { markIntroSeen } from '../../lib/introSeen';
import { IntroGuide } from './IntroGuide';
import { IntroMotion } from './IntroMotion';

/**
 * 앱을 처음 실행한 사람에게만 보이는 인트로(01~04) → 온보딩 가이드(05~08) → 로그인
 * 「건너뛰기」·「시작하기」에서 본 것으로 기록. 기록은 앱 데이터라 앱을 다시 설치하면 다시 보임(`introSeen`)
 */
export function IntroScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<'motion' | 'guide'>('motion');
  // IntroMotion이 애니메이션을 불러오는 effect에 쓰므로 렌더마다 바뀌지 않게
  const showGuide = useCallback(() => setStage('guide'), []);

  const finish = () => {
    markIntroSeen();
    router.replace(LOGIN_PATH);
  };

  return stage === 'motion' ? (
    <IntroMotion onNext={showGuide} onSkip={finish} />
  ) : (
    <IntroGuide onDone={finish} />
  );
}
