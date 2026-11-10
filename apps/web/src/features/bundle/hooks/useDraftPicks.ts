'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { Draft } from '../lib/types';
import { pickersOf, togglePick, type Picks } from '../lib/picks';

// 대표 사진 투표를 담는 서버 모델이 아직 없어, 이 브라우저 탭 메모리에만 초안별로 보관(새로고침하면 사라짐)
// 서버가 정해지면 이 hook의 저장소만 API로 바꿈
const EMPTY: Picks = {};
const store = new Map<string, Picks>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 테스트에서 초안 사이에 투표가 새지 않도록 비움 */
export const resetDraftPicks = () => {
  store.clear();
  listeners.forEach((listener) => listener());
};

/** 테스트에서 투표가 이미 있는 상태로 시작하도록 채움 */
export const seedDraftPicks = (draftId: string, picks: Picks) => {
  store.set(draftId, picks);
  listeners.forEach((listener) => listener());
};

/** 초안별 대표 사진 투표와 「이 사진 픽하기」 토글 */
export function useDraftPicks(draftId: string | undefined, memberId: string | undefined) {
  const picks = useSyncExternalStore(
    subscribe,
    () => (draftId === undefined ? EMPTY : (store.get(draftId) ?? EMPTY)),
    () => EMPTY,
  );

  const toggle = useCallback(
    (photoId: string) => {
      if (draftId === undefined || memberId === undefined) return;
      store.set(draftId, togglePick(store.get(draftId) ?? EMPTY, photoId, memberId));
      listeners.forEach((listener) => listener());
    },
    [draftId, memberId],
  );

  return { picks, toggle };
}

/** 이 사진을 번들 멤버가 픽했는지(나간 멤버의 픽은 세지 않음). 사진을 지울 때 「픽도 함께 삭제」 안내에 씀 */
export function useIsPhotoPicked(draft: Draft) {
  const { picks } = useDraftPicks(draft.id, undefined);

  return useCallback(
    (photoId: string) =>
      pickersOf(picks, photoId).some((memberId) =>
        draft.members.some((member) => member.id === memberId),
      ),
    [picks, draft.members],
  );
}
