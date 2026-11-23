'use client';

import { setToastPresenter, toast, type ToastPresentation } from '@app/design-system';
import { useEffect } from 'react';
import { appBridge, hasNativeMethod } from '@/shared/bridge/client';

// 토스트 id는 등록을 다시 해도 겹치지 않게 문서 전체에서 하나씩 올림(늦게 온 액션 눌림이 새 토스트의 액션을 실행하지 않게)
let sequence = 0;
// 지금 표시 방법을 가진 등록(같은 문서에 이 hook이 둘 겹쳐도 가진 쪽만 액션을 실행)
let owner: symbol | null = null;

/**
 * 네이티브 플로팅 버튼을 쓰는 화면에서 그 탭의 아래쪽 토스트를 iOS 쉘의 네이티브 토스트로 띄움(#503, 결정 기록 030)
 * 버튼이 WebView 위에 그려져 웹 토스트가 그 뒤에 깔리기 때문. 위쪽 토스트·다른 화면·브라우저·이 메서드가 없는 이전 쉘은 웹 토스트
 * 시트·로딩으로 버튼을 잠시 지운 동안에도 유지(시트를 닫자마자 띄운 토스트가 웹으로 그려진 뒤 다시 나온 버튼에 가리지 않게)
 * 쉘이 거절하면(형식이 맞지 않음 등) 같은 토스트를 웹으로 다시 띄움
 */
export function useNativeToastPresenter(tab: string, active: boolean) {
  useEffect(() => {
    if (!active || !hasNativeMethod('showNativeToast')) return;
    const token = Symbol(tab);
    owner = token;
    // 지금 떠 있는 네이티브 토스트의 액션(한 번에 하나만 보임)
    let current: { id: string; onClick: () => void } | null = null;
    let latest = 0;
    let fallingBack = false;

    const showOnWeb = ({ message, icon, action, duration, fullWidth }: ToastPresentation) => {
      fallingBack = true;
      try {
        toast(message, { icon, action, duration: duration ?? Infinity, fullWidth });
      } finally {
        fallingBack = false;
      }
    };

    const removeListener = appBridge.addEventListener('nativeToastAction', (event) => {
      if (owner !== token || event.tab !== tab || event.id !== current?.id) return;
      const { onClick } = current;
      current = null;
      onClick();
    });

    const unregister = setToastPresenter({
      show: (presentation) => {
        if (fallingBack) return false;
        sequence += 1;
        const order = sequence;
        latest = order;
        const id = `${tab}-${order}`;
        const { message, icon, action, duration, fullWidth } = presentation;
        current = action ? { id, onClick: action.onClick } : null;
        appBridge
          .showNativeToast({
            tab,
            id,
            message,
            ...(icon && { icon }),
            ...(action && { action: { label: action.label } }),
            duration,
            fullWidth,
          })
          // 그 사이 다른 토스트가 대체했으면 되살리지 않음
          .then((shown) => {
            if (shown !== true && latest === order) showOnWeb(presentation);
          })
          .catch(() => {
            if (latest === order) showOnWeb(presentation);
          });
        return true;
      },
      hide: () => {
        current = null;
        latest = 0;
        void appBridge.hideNativeToast({ tab }).catch(() => {});
      },
    });

    return () => {
      if (owner === token) owner = null;
      unregister();
      removeListener();
    };
  }, [tab, active]);
}
