'use client';

import { useEffect, useRef, useState } from 'react';
import { markPageLoading } from '@/shared/lib/pageLoadingState';
import { LoadingRipple } from './LoadingRipple';

/** 짧은 동작·흐름 안의 단계에서 덮개를 늦게 띄우는 기준 시간(이 안에 끝나면 덮지 않음, motion.md 로딩 상태) */
export const LATE_OVERLAY_MS = 1000;

/** 첫 진입(보일 내용 없음)을 늦게 덮을 때 처음부터 읽어 줄 상태 안내 */
export const PAGE_LOADING_LABEL = '화면을 불러오는 중이에요';

type PageLoadingProps = {
  /** 이 시간이 지나도 끝나지 않을 때만 덮음. 기본은 바로 덮음 */
  delayMs?: number | undefined;
  /** 호출하는 쪽에 상태 안내가 없을 때(첫 진입) 처음부터 읽어 줄 문구. 덮개를 늦춰도 빈 화면 동안 안내가 있게 함 */
  label?: string | undefined;
};

/**
 * 페이지 전체 로딩: 화면 전체를 `overlay-dim-subtle`로 덮고 가운데에 물결 점 패턴(`loading.json`)
 * 필요할 때만 씀: 첫 진입(보일 내용 없음)과 길거나 되돌릴 수 없는 작업. 짧은 저장 뒤 화면 이동은 버튼 비활성만(motion.md 로딩 상태)
 * 덮는 동안 아래 화면은 눌러도 반응하지 않고(스크린 리더 가상 커서는 막지 않음), 상태 안내는 호출하는 쪽의 live region이 담당
 * 키보드도 막기 위해 보이는 동안 초점을 이 덮개로 옮기고 Tab을 막음(끝나면 초점이 덮개에 남아 있을 때만 원래 자리로 되돌림)
 * `delayMs`를 주면 그 시간이 지나야 나타남(로딩 표시·키보드 막기도 그때부터)
 */
export function PageLoading({ delayMs = 0, label }: PageLoadingProps = {}) {
  const [shown, setShown] = useState(delayMs <= 0);
  // 화면 전환 뒤 띄울 토스트·앱 스플래시가 로딩이 끝나길 기다리도록 붙는 순간부터 알림(덮개를 늦춰도 빈 화면에서 먼저 뜨지 않게)
  useEffect(() => markPageLoading(), []);
  useEffect(() => {
    if (delayMs <= 0) return;
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  return (
    <>
      {label ? (
        <p role="status" className="sr-only">
          {label}
        </p>
      ) : null}
      {shown ? <PageLoadingOverlay /> : null}
    </>
  );
}

function PageLoadingOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);

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
