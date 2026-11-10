'use client';

import { useEffect, useRef } from 'react';
import { markPageLoading } from '@/shared/lib/pageLoadingState';
import { LoadingRipple } from './LoadingRipple';

/**
 * 페이지 전체 로딩(앱 공통 기준, 편집 중이 아닌 로딩 상태는 모두 이 표시): 화면 전체를 `overlay-dim-subtle`로 덮고 가운데에 물결 점 패턴(`loading.json`)
 * 덮는 동안 아래 화면은 눌러도 반응하지 않고(스크린 리더 가상 커서는 막지 않음), 상태 안내는 호출하는 쪽의 live region이 담당
 * 키보드도 막기 위해 보이는 동안 초점을 이 덮개로 옮기고 Tab을 막음(끝나면 초점이 덮개에 남아 있을 때만 원래 자리로 되돌림)
 */
export function PageLoading() {
  const overlayRef = useRef<HTMLDivElement>(null);

  // 화면 전환 뒤 띄울 토스트가 로딩이 끝나길 기다리도록 로딩 중임을 알림
  useEffect(() => markPageLoading(), []);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    overlay.focus({ preventScroll: true });

    // 덮개 뒤 화면으로 초점이 넘어가지 않게 Tab을 막음
    const blockTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      overlay.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', blockTab, true);

    return () => {
      document.removeEventListener('keydown', blockTab, true);
      // 다른 곳(예: 오류가 난 입력란)으로 초점이 옮겨졌으면 그대로 둠
      const active = document.activeElement;
      if (previous?.isConnected && (active === overlay || active === document.body)) {
        previous.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="bg-overlay-dim-subtle fixed inset-0 z-30 flex items-center justify-center outline-none"
    >
      <LoadingRipple />
    </div>
  );
}
