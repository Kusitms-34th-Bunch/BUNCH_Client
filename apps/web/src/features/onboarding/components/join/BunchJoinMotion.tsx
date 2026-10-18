'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { InviteAnimation } from './InviteAnimation';

// 동작 줄이기에서는 로티를 재생하지 않고 잠깐 안내만 보여 준 뒤 넘어간다
const REDUCED_MOTION_HOLD_MS = 800;

// 로티(30fps, 120프레임)는 연보라 원이 프레임 58~89에 커지고 그 뒤 약 1초는 변화 없이 끝난다
// 정지한 채 기다리지 않게 원이 다 커진 직후(프레임 96)에 넘어가고, 그 전에(프레임 80) 화면 배경을 연보라로 번지게 해서 다음 화면 배경과 이어 준다
const TINT_FRAME = 80;
const HAND_OFF_FRAME = 96;

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
// 서버·hydration 첫 렌더는 동작 줄이기로 보고(`AppTransitions`와 같다) 로티를 그리지 않는다. 실제 설정은 hydration 직후 반영된다
const getServerReducedMotion = () => true;

/**
 * 초대 링크를 확인하는 동안 초대장 로티를 재생하는 화면. 재생이 끝나면 초대 확인 화면으로 자동 이동한다
 * 번치 정보 조회 API가 없어 재생 시간(약 4초)이 곧 로딩 시간이다. 이동은 `replace`라 뒤로 가기로 돌아오지 않는다
 */
export function BunchJoinMotion() {
  const router = useRouter();
  const moved = useRef(false);
  const mounted = useRef(true);
  const [tinted, setTinted] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    getServerReducedMotion,
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const goNext = useCallback(() => {
    // 화면을 떠난 뒤 재생 라이브러리가 이벤트를 보내도 이동하지 않는다
    if (moved.current || !mounted.current) return;
    moved.current = true;
    router.replace(ONBOARDING_PATHS.joinBunchInvitation);
  }, [router]);

  const handleFrame = useCallback(
    (frame: number) => {
      if (frame >= TINT_FRAME) setTinted(true);
      if (frame >= HAND_OFF_FRAME) goNext();
    },
    [goNext],
  );

  useEffect(() => {
    if (!reducedMotion) return;
    const timer = setTimeout(goNext, REDUCED_MOTION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion, goNext]);

  return (
    <PageShell
      // 배경은 로티가 끝나는 원 색(초대 확인 화면 배경)으로 번진다
      className={`transition-colors duration-300 motion-reduce:transition-none ${tinted ? 'bg-surface-brand-subtle-1' : ''}`}
    >
      {/* 보이는 글자가 없는 화면이라 제목으로 불러오는 중임을 전한다. 라이브 영역(role=status)은 처음부터 들어 있는 글자를 알리지 않는다 */}
      <h1 className="sr-only">초대받은 번치 정보를 불러오는 중이에요.</h1>
      <div className="size-full">
        {reducedMotion ? null : (
          <InviteAnimation onFrame={handleFrame} onComplete={goNext} onError={goNext} />
        )}
      </div>
    </PageShell>
  );
}
