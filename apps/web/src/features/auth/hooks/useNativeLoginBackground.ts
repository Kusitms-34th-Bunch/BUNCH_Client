import { useEffect, useState } from 'react';
import { appBridge, isNativeShell } from '@/shared/bridge/client';

/** 로그인 배경을 누가 그리는지. `pending`은 쉘에 물어보는 중(첫 프레임만 보임) */
export type LoginBackgroundSource = 'pending' | 'native' | 'web';

// 이 메서드가 없는 이전 쉘은 답하지 않을 수 있어 기다리는 한계
const NATIVE_ANSWER_TIMEOUT_MS = 1000;

/**
 * iOS 쉘이면 로그인 배경 영상을 쉘에 맡기고(WebView 뒤 네이티브 영상), 아니면 웹 영상을 씀
 * WebView 영상은 저전력 모드에서 자동 재생이 막히고 앱을 나갔다 오면 멈춘 채 남음(결정 기록 028)
 * 동작 줄이기면 영상을 요청하지 않고 웹의 첫 프레임만 둠. 화면을 떠나면 쉘의 영상을 걷음
 */
export function useNativeLoginBackground(reducedMotion: boolean): LoginBackgroundSource {
  const [answer, setAnswer] = useState<'native' | 'web' | null>(null);

  useEffect(() => {
    if (reducedMotion || !isNativeShell()) return;
    let active = true;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve(false);
      }, NATIVE_ANSWER_TIMEOUT_MS);
    });
    const request = appBridge.setNativeLoginBackground(true);
    // 기다리다 웹 영상으로 정한 뒤 쉘이 늦게 깔았다고 답하면, 가려진 채 재생되지 않게 바로 걷음
    void request
      .then((shown) => {
        // 이미 화면을 정리했으면 정리 때 걷었으므로 다시 보내지 않음(다시 그린 화면의 요청을 덮지 않게)
        if (shown && timedOut && active)
          void appBridge.setNativeLoginBackground(false).catch(() => {});
      })
      .catch(() => {});
    void Promise.race([request, timeout])
      .catch(() => false)
      .then((shown) => {
        clearTimeout(timer);
        if (active) setAnswer(shown ? 'native' : 'web');
      });
    return () => {
      active = false;
      clearTimeout(timer);
      setAnswer(null);
      void appBridge.setNativeLoginBackground(false).catch(() => {});
    };
  }, [reducedMotion]);

  if (reducedMotion || !isNativeShell()) return 'web';
  return answer ?? 'pending';
}
