import { hashKey, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { appBridge, isNativeShell, nativeShellTab } from '@/shared/bridge/client';
import { sharedKeys } from './keys';

const ME_HASH = hashKey(sharedKeys.me());

// 다른 탭이 알아야 하는 내 정보: 지금 번치(전환·나가기·삭제·번치 프로필)와 내 닉네임·사진
const watched = (data: unknown) => {
  const me = data as
    | { memberId?: unknown; nickname?: unknown; imageSrc?: unknown; bunch?: unknown }
    | undefined;
  return JSON.stringify([me?.memberId, me?.nickname, me?.imageSrc, me?.bunch ?? null]);
};

/**
 * iOS 쉘 탭 WebView 사이에서 내 정보 변화를 맞춤(탭마다 웹 상태가 따로라 다른 탭이 이전 번치·프로필로 남음)
 * 화면에 보이는 탭에서 `members/me`가 바뀌면 다른 탭에 알리고, 받은 탭은 다시 받음. 받은 탭은 보이지 않아 다시 알리지 않음
 */
export function useNativeTabSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const tab = nativeShellTab();
    if (!isNativeShell() || !tab) return;
    // 이미 받아 둔 값이 기준(구독 전에 도착한 응답의 변화도 알림), 없으면 첫 값은 알리지 않음
    const cached = queryClient.getQueryData(sharedKeys.me());
    let last = cached === undefined ? undefined : watched(cached);
    const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      if (event.query.queryHash !== ME_HASH) return;
      const next = watched(event.query.state.data);
      const changed = last !== undefined && last !== next;
      last = next;
      if (!changed || document.visibilityState !== 'visible') return;
      void appBridge.notifyNativeTabs({ type: 'meChanged', from: tab }).catch(() => {});
    });
    const unsubscribeEvent = appBridge.addEventListener('nativeTabEvent', (event) => {
      if (event.from === tab) return;
      // 내 정보를 먼저 받아 지금 번치를 맞춘 뒤 나머지(나간·지운 번치의 화면을 먼저 다시 받아 오류가 나지 않게)
      void queryClient
        .invalidateQueries({ queryKey: sharedKeys.me() })
        .then(() => queryClient.invalidateQueries());
    });
    return () => {
      unsubscribeCache();
      unsubscribeEvent();
    };
  }, [queryClient]);
}
