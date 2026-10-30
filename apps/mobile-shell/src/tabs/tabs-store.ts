import type { SetNativeTabBarParams } from '@app/bridge';

type Listener = () => void;

let state: SetNativeTabBarParams | null = null;
const listeners = new Set<Listener>();

/** bridge의 setNativeTabBar 요청을 담는 외부 저장소(탭 화면이 useSyncExternalStore로 구독, null이면 탭 화면 아님) */
export const tabsStore = {
  get: () => state,
  set: (next: SetNativeTabBarParams | null) => {
    state = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
