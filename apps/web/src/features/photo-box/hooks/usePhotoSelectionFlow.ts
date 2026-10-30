import { toast } from '@app/design-system';
import { useRef, useState } from 'react';
import type { PhotoBoxActions, PhotoBoxData } from '../lib/types';
import { TOAST_ABOVE_TAB_BAR_OFFSET } from '../constants/layout';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import {
  MAX_BUNDLE_PHOTOS,
  canDeletePhotos,
  getDeleteKind,
  type DeleteKind,
} from '../lib/photoActions';
import { pruneSelection, toggleSelection, type PhotoSelection } from '../lib/selection';

export type PhotoMenuAction = 'save' | 'bundle' | 'date' | 'delete';

type SelectionDialog = 'bundle' | 'delete';

// 사진함 토스트는 목록 폭(343px)으로 펼침(Figma 사진함_09·11·12). 선택 모드를 끝낸 직후에는 탭 막대가 다시 보이므로 막대 위로 올림
const notify = (message: string, { aboveTabBar = false } = {}) =>
  toast(message, {
    fullWidth: true,
    ...(aboveTabBar ? { bottomOffset: TOAST_ABOVE_TAB_BAR_OFFSET } : {}),
  });

type UsePhotoSelectionFlowOptions = {
  /** 목록 데이터(준비되기 전에는 undefined) */
  data: PhotoBoxData | undefined;
  actions: PhotoBoxActions;
  /** 「번들 만들기」 확인 뒤 호출(초안 생성과 편집 화면 이동은 번들 작성 이슈가 맡음) */
  onCreateBundle?: ((_selection: PhotoSelection) => void) | undefined;
  /** 「날짜 바꾸기」를 골랐을 때(날짜 바꾸기 시트는 추후 작업) */
  onChangeDate?: ((_selection: PhotoSelection) => void) | undefined;
};

/**
 * 사진함 선택 모드의 상태와 메뉴 동작 흐름: 고르기, 저장(사진마다 로딩), 번들 만들기 확인, 삭제 확인, 선택 중 사라진 사진 정리
 * 서버·기기 동작은 `actions`로 받아 호출만 하고, 결과(성공·일부 실패·전부 실패)에 따른 선택 상태와 안내 토스트를 정함
 * 저장·삭제가 도는 동안은 다른 동작과 고르기를 막고, 그 사이 「취소」로 선택 모드를 끝냈다면 결과는 상태와 토스트에 반영하지 않음
 */
export function usePhotoSelectionFlow({
  data,
  actions,
  onCreateBundle,
  onChangeDate,
}: UsePhotoSelectionFlowOptions) {
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<PhotoSelection>([]);
  const [pending, setPending] = useState<'save' | 'delete' | undefined>(undefined);
  const [dialog, setDialog] = useState<SelectionDialog | undefined>(undefined);
  // 선택 모드를 끝낼 때마다 올려, 끝나기 전에 시작한 요청의 늦은 결과를 걸러냄
  const sessionRef = useRef(0);

  const photos = data?.photos;
  const selectedPhotos = (photos ?? []).filter((photo) => selection.includes(photo.id));
  const deleteKind: DeleteKind | undefined =
    data && selectedPhotos.length > 0 ? getDeleteKind(selectedPhotos, data.viewer) : undefined;

  const start = () => setSelecting(true);
  const stop = () => {
    sessionRef.current += 1;
    setSelecting(false);
    setSelection([]);
    setDialog(undefined);
  };

  const toggle = (photoId: string) => {
    if (pending) return;
    const result = toggleSelection(selection, photoId);
    if (result.rejected) {
      notify(PHOTO_BOX_MESSAGES.maxSelection);
      return;
    }
    setSelection(result.selection);
  };

  // 실행 직전(확인 창의 확정 버튼 포함) 고른 사진이 목록에서 사라졌는지 확인하고, 사라졌으면 선택에서 빼고 중단
  const isSelectionCurrent = () => {
    if (!photos) return false;
    const { selection: next, removedCount } = pruneSelection(
      selection,
      new Set(photos.map((photo) => photo.id)),
    );
    if (removedCount === 0) return true;
    setSelection(next);
    notify(PHOTO_BOX_MESSAGES.selectionStale(removedCount));
    return false;
  };

  const save = async () => {
    const session = sessionRef.current;
    const ids = selection;
    setPending('save');
    let failedIds: readonly string[];
    try {
      const result = await actions.savePhotos(ids);
      // 응답에 선택에 없는 id나 중복이 섞여도 고른 사진 기준으로만 집계
      failedIds = ids.filter((id) => result.failedIds.includes(id));
    } catch {
      failedIds = ids;
    }
    setPending(undefined);
    if (session !== sessionRef.current) return;

    if (failedIds.length === 0) {
      notify(PHOTO_BOX_MESSAGES.saveDone, { aboveTabBar: true });
      stop();
    } else if (failedIds.length === ids.length) {
      notify(PHOTO_BOX_MESSAGES.saveFailedAll);
    } else {
      // 저장된 사진은 선택에서 빼고 실패한 사진만 남김
      setSelection(failedIds);
      notify(PHOTO_BOX_MESSAGES.saveFailedSome(failedIds.length));
    }
  };

  const handleMenuAction = (action: PhotoMenuAction) => {
    if (pending || !data || !isSelectionCurrent()) return;
    if (action === 'save') {
      void save();
    } else if (action === 'bundle') {
      if (selection.length > MAX_BUNDLE_PHOTOS) notify(PHOTO_BOX_MESSAGES.bundleTooMany);
      else setDialog('bundle');
    } else if (action === 'date') {
      onChangeDate?.(selection);
    } else if (canDeletePhotos(selectedPhotos, data.viewer)) {
      setDialog('delete');
    } else {
      notify(PHOTO_BOX_MESSAGES.deleteForbidden);
    }
  };

  const closeDialog = () => setDialog(undefined);

  const confirmBundle = () => {
    setDialog(undefined);
    if (isSelectionCurrent()) onCreateBundle?.(selection);
  };

  const confirmDelete = async () => {
    setDialog(undefined);
    if (pending || !isSelectionCurrent()) return;
    const session = sessionRef.current;
    setPending('delete');
    try {
      const { removedCount } = await actions.deletePhotos(selection);
      setPending(undefined);
      if (session !== sessionRef.current) return;
      if (removedCount > 0) {
        notify(PHOTO_BOX_MESSAGES.deleteDone(removedCount), { aboveTabBar: true });
      }
      stop();
    } catch {
      setPending(undefined);
      // 실패하면 선택을 그대로 두어 바로 다시 시도할 수 있게 함
      if (session === sessionRef.current) notify(PHOTO_BOX_MESSAGES.deleteFailed);
    }
  };

  return {
    selecting,
    selection,
    /** 저장 또는 삭제 요청이 도는 중 */
    busy: pending !== undefined,
    saving: pending === 'save',
    dialog,
    deleteKind,
    start,
    stop,
    toggle,
    handleMenuAction,
    closeDialog,
    confirmBundle,
    confirmDelete,
  };
}
