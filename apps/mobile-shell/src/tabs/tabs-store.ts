import type { SetNativeTabBarParams } from '@app/bridge';

type Listener = () => void;

let state: SetNativeTabBarParams | null = null;
const listeners = new Set<Listener>();

/** bridge의 setNativeTabBar가 넣고 탭 화면이 구독하는 작은 외부 저장소(useSyncExternalStore용). null이면 탭 화면이 아니다 */
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
