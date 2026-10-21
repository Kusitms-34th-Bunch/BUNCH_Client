'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import styles from './BunchJoinMotion.module.css';
import { InviteAnimation } from './InviteAnimation';

// 동작 줄이기 설정 시 로티 대신 안내 후 이동
const REDUCED_MOTION_HOLD_MS = 800;

// 마지막 300ms 동안 원을 화면 끝까지 확장한 뒤 89프레임에 이동
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
  const [revealFrame, setRevealFrame] = useState<number | null>(null);
  const progress = Math.min(((revealFrame ?? TINT_FRAME) - TINT_FRAME) / 8, 1);
  const revealProgress = 1 - (1 - progress) ** 3;
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

  const handleFrame = useCallback((frame: number) => {
    if (frame >= TINT_FRAME) setRevealFrame(Math.min(frame, HAND_OFF_FRAME));
  }, []);
  const finish = useCallback(() => setRevealFrame(HAND_OFF_FRAME), []);

  useEffect(() => {
    if (revealFrame !== HAND_OFF_FRAME || reducedMotion) return;
    let painted = 0;
    // 프레임이 건너뛰어도 완성된 배경을 한 번 그린 뒤 이동
    const frame = requestAnimationFrame(() => {
      painted = requestAnimationFrame(goNext);
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(painted);
    };
  }, [revealFrame, reducedMotion, goNext]);

  useEffect(() => {
    if (!reducedMotion) return;
    const timer = setTimeout(goNext, REDUCED_MOTION_HOLD_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion, goNext]);

  return (
    <PageShell>
      {revealFrame !== null && !reducedMotion ? (
        <div
          aria-hidden="true"
          className={styles.reveal}
          style={{ clipPath: `circle(${revealProgress * 100}% at 50% var(--reveal-y))` }}
        />
      ) : null}
      {/* 초기부터 있는 status 문구는 알림이 누락될 수 있어 숨김 제목으로 로딩 상태 전달 */}
      <h1 className="sr-only">초대받은 번치 정보를 불러오는 중이에요.</h1>
      <div className="relative z-2 size-full">
        {reducedMotion ? null : (
          <InviteAnimation onFrame={handleFrame} onComplete={finish} onError={goNext} />
        )}
      </div>
    </PageShell>
  );
}
