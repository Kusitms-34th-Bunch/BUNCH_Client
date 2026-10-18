import type { SetNativeTabBarParams } from '@app/bridge';

type Listener = () => void;

let state: SetNativeTabBarParams | null = null;
const listeners = new Set<Listener>();

/** bridge의 setNativeTabBar가 넣고 NativeTabBar가 구독하는 작은 외부 저장소(useSyncExternalStore용) */
export const nativeTabBarStore = {
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
