'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { DraftPhoto } from '../lib/types';
import type { PhotoListScroll } from './usePhotoListScroll';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { getRemovePhotoKind, type RemovePhotoKind } from '../lib/photos';
import { SLOW_MOVE, useMoveAnimation } from './useMoveAnimation';

// 확인 창 닫힘 전환이 끝난 뒤에 포커스를 옮기려는 지연
const CLOSE_TRANSITION_MS = 150;
// 이동이 끝난 뒤 스크롤 스냅을 되돌리기 전에 두는 여유
const SNAP_RESTORE_GAP_MS = 50;

type RemoveDialog = { kind: RemovePhotoKind; photoId: string };

type UsePhotoRemovalOptions = {
  photos: readonly DraftPhoto[];
  removePhoto: (_photoId: string) => void;
  /** 가운데에 온 사진 번호와 목록 스크롤 동작(`usePhotoListScroll`) */
  list: Pick<
    PhotoListScroll,
    'current' | 'setActiveIndex' | 'scrollToIndex' | 'pauseSnap' | 'focusPhotoView'
  >;
  canEdit: boolean;
  isLocked: (_photoId: string) => boolean;
  /** 참여 멤버가 아니라 못 뺄 때 */
  onDenied: () => void;
  /** 다른 멤버가 편집 중이라 못 뺄 때 */
  onBlocked: () => void;
  /** 뺀 결과를 낭독하게 알림 */
  announce: (_announcement: { text: string; index: number }) => void;
};

/**
 * 캡션 화면의 사진 빼기 흐름(기능 spec 4.3.5): 마지막 1장이면 안내 창, 아니면 캡션 유무와 상관없이 항상 확인 창
 * 빼고 나면 남은 사진이 빈자리를 메우는 이동(Smart Animate·Slow·350ms), 같은 자리에 온 사진으로 스크롤·포커스를 옮김
 * `useMoveAnimation`보다 스크롤 보정이 먼저 실행돼야 이동이 새 스크롤 위치를 기준으로 계산되므로 이 hook 안에서 순서를 지킴
 */
export function usePhotoRemoval({
  photos,
  removePhoto,
  list,
  canEdit,
  isLocked,
  onDenied,
  onBlocked,
  announce,
}: UsePhotoRemovalOptions) {
  const [removeDialog, setRemoveDialog] = useState<RemoveDialog | undefined>(undefined);

  // 사진을 뺀 결과를 그릴 때 새로 보일 사진 자리로 스크롤을 먼저 맞춘 뒤(아래 움직임보다 먼저 실행), 남은 사진이 그 자리로 이동
  const pendingScroll = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    const index = pendingScroll.current;
    pendingScroll.current = undefined;
    if (index !== undefined) list.scrollToIndex(index);
  });
  const { register, capture } = useMoveAnimation(SLOW_MOVE);

  // 빼면 눌렀던 X가 사라지므로 같은 자리에 온 사진의 「크게 보기」 버튼으로 포커스를 옮기고 남은 장수를 알림(확인 창은 닫힌 뒤)
  const removeAndFocus = (photoId: string) => {
    const remaining = photos.filter((item) => item.id !== photoId);
    const nextIndex = Math.min(list.current, remaining.length - 1);
    // 남은 사진이 빈자리를 메우는 움직임을 위해 빼기 전 위치를 기억
    capture();
    list.pauseSnap(SLOW_MOVE.durationMs + SNAP_RESTORE_GAP_MS);
    removePhoto(photoId);
    // 마지막 사진을 빼면 스크롤이 끝으로 밀려 「+ 사진 추가」 카드가 가운데 오므로, 새로 보일 사진이 가운데 오게 맞춤
    list.setActiveIndex(nextIndex);
    pendingScroll.current = nextIndex;
    if (remaining[nextIndex]) {
      announce({ text: BUNDLE_MESSAGES.photoRemoved(remaining.length), index: nextIndex });
    }
    list.focusPhotoView(nextIndex, CLOSE_TRANSITION_MS);
  };

  const requestRemove = (photo: DraftPhoto) => {
    if (!canEdit) return onDenied();
    if (isLocked(photo.id)) return onBlocked();
    // 사진 한 장을 빼려면 항상 확인을 거침(1장이면 안내만)
    setRemoveDialog({ kind: getRemovePhotoKind(photos), photoId: photo.id });
  };

  const confirmRemove = () => {
    // 확인 창이 떠 있는 사이 다른 멤버가 편집을 시작했거나 사진이 이미 빠졌을 수 있어 다시 확인
    if (removeDialog && photos.some((photo) => photo.id === removeDialog.photoId)) {
      if (isLocked(removeDialog.photoId)) onBlocked();
      else if (getRemovePhotoKind(photos) === 'last') {
        // 그 사이 다른 멤버가 사진을 빼 한 장만 남았으면 지우지 않고 안내 창으로 바꿈
        setRemoveDialog({ kind: 'last', photoId: removeDialog.photoId });
        return;
      } else removeAndFocus(removeDialog.photoId);
    }
    setRemoveDialog(undefined);
  };

  return {
    /** 사진 항목을 움직임에 등록하는 ref 만들기(`register(photo.id)`) */
    register,
    removeDialog,
    requestRemove,
    confirmRemove,
    closeDialog: () => setRemoveDialog(undefined),
  };
}
