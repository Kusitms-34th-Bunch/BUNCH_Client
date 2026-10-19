'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { InviteAnimation } from './InviteAnimation';

// 동작 줄이기 설정 시 로티 대신 안내 후 이동
const REDUCED_MOTION_HOLD_MS = 800;

// 원·초대장의 마지막 움직임이 끝나는 89프레임에 바로 이동, 80프레임부터 다음 화면 배경으로 연결
const TINT_FRAME = 80;
const HAND_OFF_FRAME = 89;

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
// hydration 불일치 방지를 위해 서버·첫 렌더에서는 로티 생략
const getServerReducedMotion = () => true;

/** 번치 조회 API 미연결 상태에서 로티의 마지막 움직임까지 재생 후 초대 확인 화면으로 replace 이동 */
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

  useEffect(() => {
    router.prefetch(ONBOARDING_PATHS.joinBunchInvitation);
  }, [router]);

  const goNext = useCallback(() => {
    // 언마운트 후 이벤트·중복 이벤트에 의한 추가 이동 방지
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
      data-app-background={tinted ? 'brand-subtle-1' : undefined}
      // 로티의 마지막 원 색과 초대 확인 화면 배경 연결
      className={`transition-colors duration-300 ease-out motion-reduce:transition-none ${tinted ? 'bg-surface-brand-subtle-1' : ''}`}
    >
      {/* 초기부터 있는 status 문구는 알림이 누락될 수 있어 숨김 제목으로 로딩 상태 전달 */}
      <h1 className="sr-only">초대받은 번치 정보를 불러오는 중이에요.</h1>
      <div className="size-full">
        {reducedMotion ? null : (
          <InviteAnimation onFrame={handleFrame} onComplete={goNext} onError={goNext} />
        )}
      </div>
    </PageShell>
  );
}
