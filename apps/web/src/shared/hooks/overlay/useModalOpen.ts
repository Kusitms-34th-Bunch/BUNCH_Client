'use client';

import { useEffect, useState } from 'react';
import { isNativeShell } from '@/shared/bridge/client';

// 바텀시트·대화상자(Base UI)는 열린 동안만 role이 dialog·alertdialog인 요소를 그림
// 닫힘 애니메이션 중(data-ending-style)은 닫힌 것으로 봄. 네이티브 UI를 다시 보이는 시점은 쓰는 곳이 정함(nativeBottomCover)
const MODAL_SELECTOR =
  '[role="dialog"]:not([data-ending-style]), [role="alertdialog"]:not([data-ending-style])';

/**
 * 시트·대화상자가 열려 있는지 DOM 변화로 추적(쉘의 네이티브 UI는 WebView 위라 웹 시트를 가려 그동안 숨김)
 * `extraSelector`는 모달처럼 취급할 요소를 더함. 결과는 쉘에서만 쓰여 일반 브라우저에서는 늘 false
 */
export function useModalOpen(extraSelector?: string) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!isNativeShell()) return;
    const selector = extraSelector ? `${MODAL_SELECTOR}, ${extraSelector}` : MODAL_SELECTOR;
    const update = () => setOpen(document.querySelector(selector) !== null);
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ending-style'],
    });
    return () => observer.disconnect();
  }, [extraSelector]);
  return open;
}
