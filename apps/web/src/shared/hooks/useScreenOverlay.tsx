'use client';

import { overlay } from 'overlay-kit';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LiveOverlay } from '@/shared/components/overlay/LiveOverlay';

/** 시트·대화상자 렌더러에 그대로 펼쳐 넘기는 값 */
export type ScreenOverlayProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onOpenChangeComplete: (_open: boolean) => void;
};

type RenderOverlay = (_props: ScreenOverlayProps, _close: () => void) => ReactNode;

// 화면이 다시 그려진 횟수를 열린 창에 알리는 저장소
const createOverlayStore = () => {
  let version = 0;
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getVersion: () => version,
    bump: () => {
      version += 1;
      listeners.forEach((listener) => listener());
    },
  };
};

/**
 * 시트·대화상자를 `overlay.open`으로 여는 함수를 돌려줌. 다 닫히면 언마운트하고 `onClosed`를 부름
 * layout에 그려져 화면이 바뀌어도 남으므로, 화면을 떠나면 열린 창을 함께 지움(이때 `onClosed`는 부르지 않음)
 * 기본은 열 때의 값으로 그림. 열린 동안 바뀌는 값이 필요하면 `{ live: true }`로 열고, 값은 `usePreservedCallback`으로 감싼 함수로 읽음
 * (매번 다시 그리면 대화상자 첫 초점이 흔들리는 경우가 있어 필요한 창만 켬)
 * `closeAll`: 화면 상태가 바뀌어(로딩·오류 등) 창이 의미를 잃을 때 모두 닫음
 */
export function useScreenOverlay() {
  // 렌더와 무관한 값이라 한 번만 만들고 바꾸지 않음
  const [opened] = useState(() => new Set<string>());
  const [store] = useState(createOverlayStore);

  // 의존성 없이 매 렌더 뒤에 알림
  useEffect(() => store.bump());

  useEffect(
    () => () => {
      opened.forEach((id) => overlay.unmount(id));
      opened.clear();
    },
    [opened],
  );

  return useMemo(() => {
    const open = (
      render: RenderOverlay,
      onClosed?: () => void,
      { live = false }: { live?: boolean } = {},
    ) => {
      const id = overlay.open(({ overlayId, isOpen, close, unmount }) => (
        <LiveOverlay
          store={store}
          live={live}
          render={() =>
            render(
              {
                open: isOpen,
                onOpenChange: (next) => {
                  if (!next) close();
                },
                onOpenChangeComplete: (next) => {
                  if (next) return;
                  unmount();
                  opened.delete(overlayId);
                  onClosed?.();
                },
              },
              close,
            )
          }
        />
      ));
      opened.add(id);
      return id;
    };
    const closeAll = () => opened.forEach((id) => overlay.close(id));
    return Object.assign(open, { closeAll });
  }, [opened, store]);
}
