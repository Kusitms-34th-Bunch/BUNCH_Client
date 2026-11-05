import type { SetNativeTabBarParams } from '@app/bridge';

type Listener = () => void;

/** 탭 요청 + 탭 밖 화면(상세·온보딩)을 여는 동안의 탭 바 숨김 */
export type TabsState = SetNativeTabBarParams & { barHidden?: boolean };

let state: TabsState | null = null;
const listeners = new Set<Listener>();

/** bridge의 setNativeTabBar 요청을 담는 외부 저장소(탭 화면이 useSyncExternalStore로 구독, null이면 탭 화면 아님) */
export const tabsStore = {
  get: () => state,
  set: (next: TabsState | null) => {
    state = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
