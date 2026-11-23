'use client';

import type { SetNativeFloatingButtonParams } from '@app/bridge';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { appBridge, isNativeShell, nativeShellTab } from '@/shared/bridge/client';
import { useNativeToastPresenter } from '@/shared/hooks/native/useNativeToastPresenter';
import { useModalOpen } from '@/shared/hooks/overlay/useModalOpen';

const subscribeNever = () => () => {};

type Options = NonNullable<SetNativeFloatingButtonParams['button']> & {
  /** 버튼이 놓인 탭 ID(쉘의 탭 화면과 같은 값) */
  tab: string;
  /** 지금 화면에 버튼이 없음(예: 로딩·오류 화면). 네이티브 버튼을 지움 */
  hidden?: boolean | undefined;
  onPress?: (() => void) | undefined;
};

/**
 * iOS 26 이상 쉘이면 플로팅 버튼을 네이티브 Liquid Glass로 그리게 하고, 웹 버튼을 그릴지 돌려줌
 * 쉘 답을 받기 전에는 false(두 버튼이 겹쳐 보이지 않게), 브라우저·안드로이드·iOS 26 미만은 true
 * 시트·대화상자가 열린 동안은 네이티브 버튼을 지움(WebView 위라 시트를 가림)
 * 네이티브 버튼을 쓰는 동안은 아래쪽 토스트도 쉘이 네이티브로 띄움(WebView 안의 토스트는 버튼 뒤에 깔림, #503)
 */
export function useNativeFloatingButton({
  tab,
  icon,
  label,
  disabled,
  expanded,
  hidden = false,
  onPress,
}: Options) {
  // 서버 렌더는 쉘 여부를 몰라 웹 버튼을 그리지 않고, hydration 뒤 실제 값으로 다시 그림
  // 다른 탭 WebView가 이 화면을 열었으면 그 탭의 네이티브 버튼을 건드리지 않고 웹 버튼을 그림
  const inShell = useSyncExternalStore(
    subscribeNever,
    () => isNativeShell() && nativeShellTab() === tab,
    () => true,
  );
  const [native, setNative] = useState<boolean | null>(null);
  const modalOpen = useModalOpen();
  const press = usePreservedCallback(() => onPress?.());

  useEffect(() => {
    if (!inShell) return;
    let current = true;
    appBridge
      .setNativeFloatingButton({
        tab,
        button: modalOpen || hidden ? null : { icon, label, disabled, expanded },
      })
      .then((shown) => {
        // 지우기 요청의 답은 웹 버튼 여부와 무관. 제한 시간을 넘긴 답(undefined)은 웹 버튼으로
        if (current && !modalOpen && !hidden) setNative(shown === true);
      })
      .catch(() => current && setNative(false));
    return () => {
      current = false;
    };
  }, [inShell, tab, icon, label, disabled, expanded, hidden, modalOpen]);

  // 화면을 떠나면 그 탭의 네이티브 버튼 정리
  useEffect(() => {
    if (!inShell) return;
    return () => void appBridge.setNativeFloatingButton({ tab, button: null }).catch(() => {});
  }, [inShell, tab]);

  // 시트·로딩으로 버튼을 잠시 지운 동안에도 토스트는 쉘로(닫자마자 띄운 토스트가 다시 나온 버튼에 가리지 않게)
  useNativeToastPresenter(tab, inShell && native === true);

  // 눌림은 모든 탭 WebView에 오므로 자기 탭·화면에 보이는 WebView만 처리
  useEffect(() => {
    if (!inShell) return;
    return appBridge.addEventListener('nativeFloatingButtonPress', (event) => {
      if (event.tab === tab && document.visibilityState === 'visible') press();
    });
  }, [inShell, tab, press]);

  return !inShell || native === false;
}
