'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import { BUNDLE_MESSAGES } from '../constants/messages';

type Options = {
  /** 사진 목록(`[data-photo-id]` 항목 안의 `[data-move]` 버튼으로 초점을 돌려줌) */
  listRef: RefObject<HTMLUListElement | null>;
  /** 화면에 보이는 사진 순서 */
  photoIds: readonly string[];
  onMovePhoto: (_photoId: string, _toIndex: number) => void;
};

/**
 * 키보드·스크린 리더용 앞·뒤로 옮기기: 옮긴 뒤 같은 사진의 같은 버튼으로 포커스를 돌려주고 결과를 낭독
 * 자리가 바뀌면 브라우저가 포커스를 잃을 수 있어, 바뀐 순서가 그려진 렌더 뒤(effect)에서 돌려줌
 */
export function usePhotoMoveFocus({ listRef, photoIds, onMovePhoto }: Options) {
  const total = photoIds.length;
  const order = photoIds.join('|');
  const pendingFocus = useRef<{
    photoId: string;
    move: 'before' | 'after';
    order: string;
  } | null>(null);
  // 1초가 지나도록 자리가 바뀌지 않으면(옮기지 못함) 기다리던 포커스 복원을 버려, 나중의 다른 변경에서 포커스를 가져가지 않게 함
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(pendingTimer.current), []);
  const [moveAnnouncement, setMoveAnnouncement] = useState('');
  const announceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(announceTimer.current), []);
  // 같은 문구도 다시 읽히도록 영역을 한 번 비웠다가 채움(같은 값이면 보조 기기가 읽지 않음)
  const announceMove = (message: string) => {
    clearTimeout(announceTimer.current);
    setMoveAnnouncement('');
    announceTimer.current = setTimeout(() => setMoveAnnouncement(message), 100);
  };
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    // 화면의 자리가 바뀔 때까지 기다림(바뀌는 렌더에서 포커스를 돌려줌)
    if (target.order === order) return;
    pendingFocus.current = null;
    clearTimeout(pendingTimer.current);
    const item = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[data-photo-id]') ?? []),
    ].find((element) => element.dataset.photoId === target.photoId);
    item?.querySelector<HTMLElement>(`[data-move="${target.move}"]`)?.focus();
  });
  const movePhotoBy = (photoId: string, index: number, step: -1 | 1) => {
    const to = index + step;
    if (to < 0 || to >= total) return;
    pendingFocus.current = {
      photoId,
      move: step < 0 ? 'before' : 'after',
      order,
    };
    clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => {
      pendingFocus.current = null;
    }, 1000);
    onMovePhoto(photoId, to);
    announceMove(BUNDLE_MESSAGES.photoMoved(to + 1, total));
  };

  return { moveAnnouncement, movePhotoBy };
}
