'use client';

import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActionsContext,
  createStore,
  type PhotoSelectionValue,
  StoreContext,
} from './photoSelection';

/**
 * 날짜 섹션·아코디언·격자를 지나 사진 칸까지 선택 상태를 내려 주는 provider(prop drilling 방지)
 * 값은 호출하는 쪽에서 매 렌더 새로 만들어도 되고, 안에서 토글 함수는 항상 최신 것을 부르는 고정 함수로, 선택 목록은 구독 방식 저장소로 나눠 내림
 */
export function PhotoSelectionProvider({
  value,
  children,
}: {
  value: PhotoSelectionValue;
  children: ReactNode;
}) {
  const { active, selection, onToggle } = value;
  const [store] = useState(() => createStore(selection));
  const onToggleRef = useRef(onToggle);

  // 자식 effect(쓸어서 고르기)가 같은 커밋에서 최신 토글을 쓰도록 layout 단계에서 갱신
  useLayoutEffect(() => {
    onToggleRef.current = onToggle;
  });
  useLayoutEffect(() => {
    store.set(selection);
  }, [store, selection]);

  const stableToggle = useCallback((photoId: string) => onToggleRef.current(photoId), []);
  const actions = useMemo(() => ({ active, onToggle: stableToggle }), [active, stableToggle]);

  return (
    <ActionsContext.Provider value={actions}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </ActionsContext.Provider>
  );
}
