'use client';

import { type ReactNode, useSyncExternalStore } from 'react';

/** 화면이 다시 그려진 횟수를 알리는 저장소(`useScreenOverlay`가 만듦) */
type Store = { subscribe: (_listener: () => void) => () => void; getVersion: () => number };

const ignore = () => () => {};
const fixedVersion = () => 0;

/** `live`면 화면이 다시 그려질 때마다 열린 창도 다시 그림 */
export function LiveOverlay({
  store,
  live,
  render,
}: {
  store: Store;
  live: boolean;
  render: () => ReactNode;
}) {
  useSyncExternalStore(live ? store.subscribe : ignore, live ? store.getVersion : fixedVersion);
  return render();
}
