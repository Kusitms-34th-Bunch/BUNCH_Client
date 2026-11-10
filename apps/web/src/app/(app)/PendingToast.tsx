'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { getPageLoadingCount, subscribePageLoading } from '@/shared/lib/pageLoadingState';
import {
  getPendingToast,
  settlePendingToast,
  subscribePendingToast,
} from '@/shared/lib/toastAfterNavigation';

// 도착 화면의 PageLoading이 붙을 시간을 주기 위해 경로가 바뀐 뒤 최소로 기다리는 프레임 수
const MIN_FRAMES = 2;
// 전환 애니메이션(data-page-leaving)이 끝나길 기다리는 최대 시간. 전환이 중단돼 표식이 남아도 토스트가 영영 안 뜨는 일 방지
const MAX_TRANSITION_WAIT_MS = 3000;

/**
 * `toastAfterNavigation()`으로 예약한 토스트를 도착 화면에서 띄움
 * 조건: 경로가 바뀜 → 도착 화면의 전체 로딩(PageLoading)이 없음 → 화면 전환 애니메이션이 끝남(나가는 화면 `data-page-leaving` 없음)
 * 조건을 채운 뒤 `toast()`를 부르므로 위치는 도착 화면의 하단 영역·탭 막대 기준으로 정해짐
 */
export function PendingToast() {
  const pathname = usePathname();
  const pending = useSyncExternalStore(subscribePendingToast, getPendingToast, () => null);
  const loading = useSyncExternalStore(subscribePageLoading, getPageLoadingCount, () => 0);

  // 이동이 시작되지 않거나 실패해 경로가 안 바뀌면 만료 시각에 버림(나중에 다른 화면에서 맥락 없이 뜨는 일 방지)
  const waitingForPath = pending !== null && pathname === pending.fromPath;
  useEffect(() => {
    if (!pending || !waitingForPath) return;
    const timer = setTimeout(
      () => settlePendingToast(false),
      Math.max(0, pending.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [pending, waitingForPath]);

  // 경로가 바뀐 뒤에는 만료 없이 도착 화면의 로딩이 끝나길 기다림
  useEffect(() => {
    if (!pending || waitingForPath || loading > 0) return;

    let frames = 0;
    let frame = 0;
    const startedAt = Date.now();
    const tick = () => {
      frames += 1;
      const transitioning = document.querySelector('[data-page-leaving]') !== null;
      if (
        frames >= MIN_FRAMES &&
        (!transitioning || Date.now() - startedAt > MAX_TRANSITION_WAIT_MS)
      ) {
        settlePendingToast(true);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pending, waitingForPath, loading]);

  return null;
}
