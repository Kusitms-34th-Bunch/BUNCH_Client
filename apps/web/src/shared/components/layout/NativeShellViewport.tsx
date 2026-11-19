'use client';

import { useEffect } from 'react';
import { isNativeShell } from '@/shared/bridge/client';

const NO_ZOOM = 'maximum-scale=1, user-scalable=no';

const lockZoom = () => {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (meta && !meta.content.includes('user-scalable')) meta.content = `${meta.content}, ${NO_ZOOM}`;
};

/**
 * 앱 쉘에서만 화면 전체 확대·축소를 막음(사진 확대는 Swiper Zoom이 따로 맡음). 브라우저는 접근성을 위해 그대로 둠
 * viewport는 Next가 화면·쿼리마다 다시 그리거나 바꿀 수 있어 head 변화를 지켜보며 다시 덧붙임
 */
export function NativeShellViewport() {
  useEffect(() => {
    if (!isNativeShell()) return;
    lockZoom();
    const observer = new MutationObserver(lockZoom);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['content'],
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
