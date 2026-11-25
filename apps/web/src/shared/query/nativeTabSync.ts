import { hashKey, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { appBridge, isNativeShell, nativeShellTab } from '@/shared/bridge/client';
import { sharedKeys } from './keys';

const ME_HASH = hashKey(sharedKeys.me());

// 서버에 저장되기 전에 이 탭에만 먼저 쓰는 중(번치 전환의 낙관적 값). 다른 탭이 저장 전 서버 값을 받아 남지 않게 알리지 않음
// 캐시는 쓴 객체를 복사해 저장하므로 객체가 아니라 쓰는 동안의 표시로 구분(캐시 구독은 쓰기 안에서 바로 불림)
let writingLocalOnly = false;
/** 다른 탭에 알리지 않고 내 정보를 씀(저장이 끝난 뒤 쓰는 값이 다시 알림) */
export const writeLocalOnly = (write: () => void) => {
  writingLocalOnly = true;
  try {
    write();
  } finally {
    writingLocalOnly = false;
  }
};

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
      if (writingLocalOnly) return;
      const next = watched(event.query.state.data);
      const changed = last !== undefined && last !== next;
      last = next;
      if (!changed || document.visibilityState !== 'visible') return;
      void appBridge.notifyNativeTabs({ type: 'meChanged', from: tab }).catch(() => {});
    });
    const unsubscribeEvent = appBridge.addEventListener('nativeTabEvent', (event) => {
      if (event.from === tab) return;
      // 내 정보를 먼저 받아 지금 번치를 맞춘 뒤 나머지(내 정보가 실패하면 이전 번치 키에 새 번치 응답이 섞이지 않게 멈춤)
      void queryClient
        .invalidateQueries({ queryKey: sharedKeys.me() }, { throwOnError: true })
        .then(
          () => queryClient.invalidateQueries(),
          () => {},
        );
    });
    return () => {
      unsubscribeCache();
      unsubscribeEvent();
    };
  }, [queryClient]);
}
