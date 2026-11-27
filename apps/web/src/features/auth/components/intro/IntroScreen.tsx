'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { preload } from 'react-dom';
import { LOGIN_BACKGROUND_POSTER } from '../../constants/loginBackground';
import { LOGIN_PATH } from '../../constants/paths';
import { markIntroSeen } from '../../lib/introSeen';
import { IntroGuide } from './IntroGuide';
import { IntroMotion } from './IntroMotion';

/**
 * 앱을 처음 실행한 사람에게만 보이는 인트로(01~04) → 온보딩 가이드(05~08) → 로그인
 * 「건너뛰기」·「시작하기」에서 본 것으로 기록. 기록은 앱 데이터라 앱을 다시 설치하면 다시 보임(`introSeen`)
 */
export function IntroScreen() {
  // 로그인 배경 첫 프레임을 미리 받음(같은 주소는 React가 한 번만 요청해 렌더마다 불러도 됨)
  preload(LOGIN_BACKGROUND_POSTER, { as: 'image' });
  const router = useRouter();
  const [stage, setStage] = useState<'motion' | 'guide'>('motion');
  // IntroMotion이 애니메이션을 불러오는 effect에 쓰므로 렌더마다 바뀌지 않게
  const showGuide = () => setStage('guide');

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
