// 크기 유지: 저장·번들·날짜·삭제가 같은 선택·요청 중 상태·선택 회차와 사라진 사진 확인을 함께 씀
import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import type { PhotoBoxActions, PhotoBoxData, SaveResult } from '../lib/types';
import { askDateChangeConfirm } from '../components/askDateChangeConfirm';
import { DeleteConfirmDialog } from '../components/PhotoSelectionDialogs';
import { SavingDateSheet } from '../components/SavingDateSheet';
import { deleteConfirmCopy, PHOTO_BOX_MESSAGES } from '../constants/messages';
import { MissingPhotosError } from '../lib/missingPhotos';
import {
  MAX_BUNDLE_PHOTOS,
  canDeletePhotos,
  countCoUploaded,
  getDateConfirmKind,
  getDeleteKind,
  removesDraftBundlePhoto,
  needsDateChangeConfirm,
  type DeleteKind,
} from '../lib/photoActions';
import { pruneSelection, toggleSelection, type PhotoSelection } from '../lib/selection';
import { clearPhotoBoxSelection, readPhotoBoxSelection } from '../lib/selectionResume';
import { useSaveBlockedNotice } from './useSaveBlockedNotice';

export type PhotoMenuAction = 'save' | 'bundle' | 'date' | 'delete';

// 선택 모드를 끝낸 직후에는 탭 막대가 다시 보이는데, toast()가 다음 프레임에 위치를 다시 재므로 막대 위에 놓임
const notify = (message: string) => toast(message);

type UsePhotoSelectionFlowOptions = {
  /** 목록 데이터(준비되기 전에는 undefined) */
  data: PhotoBoxData | undefined;
  actions: PhotoBoxActions;
  /** 「번들 만들기」 확인 뒤 호출(초안 생성과 편집 화면 이동은 호출하는 쪽이 맡음) */
  onCreateBundle?: ((_selection: PhotoSelection) => void) | undefined;
  /** 삭제 요청이 끝나 선택 모드를 닫은 직후(사라진 사진이 0장인 경우도 포함). 눌렀던 메뉴·선택 칸이 사라져 초점이 갈 곳을 잃으므로 화면이 초점을 옮기는 호출 지점 */
  onDeleted?: (() => void) | undefined;
};

/**
 * 사진함 선택 모드의 상태와 메뉴 동작 흐름: 고르기, 저장(화면 전체 로딩), 번들 만들기 확인, 삭제 확인, 선택 중 사라진 사진 정리
 * 서버·기기 동작은 `actions`로 받아 호출만 하고, 결과(성공·일부 실패·전부 실패)에 따른 선택 상태와 안내 토스트를 정함
 * 저장·삭제가 도는 동안은 다른 동작과 고르기를 막고, 그 사이 「취소」로 선택 모드를 끝냈다면 결과는 상태와 토스트에 반영하지 않음
 */
export function usePhotoSelectionFlow({
  data,
  actions,
  onCreateBundle,
  onDeleted,
}: UsePhotoSelectionFlowOptions) {
  // 참여 멤버 고르기에서 뒤로 왔으면 그때 고른 사진과 번호로 선택 모드를 이어 감(기능 spec 3.3.4)
  const [resumed] = useState(readPhotoBoxSelection);
  const [selecting, setSelecting] = useState(resumed !== undefined);
  // 늦게 끝난 삭제 실패가 그 사이 시작한 새 선택을 덮지 않게 지금 선택 중인지 확인
  const selectingRef = useRef(selecting);
  useEffect(() => {
    selectingRef.current = selecting;
  }, [selecting]);
  const [selection, setSelection] = useState<PhotoSelection>(() => [...(resumed?.photoIds ?? [])]);

  const [pending, setPending] = useState<'save' | 'date' | undefined>(undefined);
  const noData = !data;
  // 목록이 준비되면(화면이 이때 다시 마운트되기도 함) 되살린 선택을 한 번 확인함
  // 다른 번치의 선택이거나 사진이 하나도 남지 않았으면 선택 모드를 켜지 않고, 일부만 사라졌으면 남은 사진만 이어 감
  const [resumeChecked, setResumeChecked] = useState(false);
  if (data && !resumeChecked) {
    setResumeChecked(true);
    if (resumed) {
      const existing = new Set(data.photos.map((photo) => photo.id));
      const kept =
        resumed.bunchId === data.bunch.id ? resumed.photoIds.filter((id) => existing.has(id)) : [];
      if (kept.length === 0) {
        setSelecting(false);
        setSelection([]);
      } else if (kept.length !== resumed.photoIds.length) {
        setSelection(kept);
      }
    }
  }
  // 확인이 끝났으면 기억한 값을 비워, 다음에 사진함을 열 때 선택 모드가 남지 않게 함
  useEffect(() => {
    if (!noData) clearPhotoBoxSelection();
  }, [noData]);
  const openOverlay = useScreenOverlay();
  const notifySaveBlocked = useSaveBlockedNotice();
  // 화면 상태가 바뀌어(목록을 못 받음) 창이 의미를 잃으면 모두 닫음
  useEffect(() => {
    if (noData) openOverlay.closeAll();
  }, [noData, openOverlay]);
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
  // 사라진 걸 알았으면 목록을 다시 받은 뒤 알림(다른 변화도 함께 맞춤, 3.3.1). 받기 실패는 20초 갱신에 맡김
  const isSelectionCurrent = () => {
    if (!photos) return false;
    const { selection: next, removedCount } = pruneSelection(
      selection,
      new Set(photos.map((photo) => photo.id)),
    );
    if (removedCount === 0) return true;
    setSelection(next);
    void actions
      .refreshPhotos()
      .catch(() => undefined)
      .then(() => notify(PHOTO_BOX_MESSAGES.selectionStale(removedCount)));
    return false;
  };

  const save = async () => {
    const session = sessionRef.current;
    const ids = selection;
    setPending('save');
    let failedIds: readonly string[];
    let blocked: SaveResult['blocked'];
    try {
      const result = await actions.savePhotos(ids);
      // 응답에 선택에 없는 id나 중복이 섞여도 고른 사진 기준으로만 집계
      failedIds = ids.filter((id) => result.failedIds.includes(id));
      blocked = result.blocked;
    } catch {
      failedIds = ids;
    }
    setPending(undefined);
    if (session !== sessionRef.current) return;

    // 저장을 시도하지 못했으면(권한 거부 등) 실패 토스트 대신 이유를 안내하고 선택은 유지
    if (blocked) {
      notifySaveBlocked(blocked);
      return;
    }

    if (failedIds.length === 0) {
      notify(PHOTO_BOX_MESSAGES.saveDone);
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
      // 1~20장이면 확인 창 없이 참여 멤버 고르기로 넘어감(기능 spec 3.3.4)
      if (selection.length > MAX_BUNDLE_PHOTOS) notify(PHOTO_BOX_MESSAGES.bundleTooMany);
      else confirmBundle();
    } else if (action === 'date') {
      // 날짜는 항상 오늘 달을 선택 없이 열고(명세 3.4.1) 저장하면 고른 사진 전부의 날짜를 바꿈
      if (canDeletePhotos(selectedPhotos, data.viewer)) {
        openOverlay((rootProps, close) => (
          <SavingDateSheet {...rootProps} close={close} beforeSave={checkDate} save={applyDate} />
        ));
      } else notify(PHOTO_BOX_MESSAGES.dateForbidden);
    } else if (canDeletePhotos(selectedPhotos, data.viewer)) {
      const copy = deleteConfirmCopy(
        deleteKind ?? 'own',
        selectedPhotos.length,
        countCoUploaded(selectedPhotos),
        removesDraftBundlePhoto(selectedPhotos, data.viewer),
      );
      openOverlay((rootProps, close) => (
        <DeleteConfirmDialog
          {...rootProps}
          title={copy.title}
          lines={copy.lines}
          onConfirm={() => {
            close();
            void confirmDelete();
          }}
        />
      ));
    } else {
      notify(PHOTO_BOX_MESSAGES.deleteForbidden);
    }
  };

  // 창이 열려 있는 사이 목록이 바뀔 수 있어 확정할 때의 최신 값으로 다시 확인
  const confirmBundle = usePreservedCallback(() => {
    if (isSelectionCurrent()) onCreateBundle?.(selection);
  });

  // 서버가 거절하며 알려 준 사라진 사진(`PHOTO_004`)을 선택에서 빼고 안내함. 선택 모드는 유지(전부 사라져 0장이 되어도 토스트만 보이고 선택 모드는 그대로, 명세 3.3.1)
  // 서버가 사라진 사진을 알려 주지 않았으면(빈 목록) 빼지 못하므로 일반 실패로 다루고 false를 돌려줌
  const dropMissing = (
    ids: PhotoSelection,
    missingIds: readonly string[],
    failMessage: string,
  ): boolean => {
    const missing = new Set(missingIds);
    const remaining = ids.filter((id) => !missing.has(id));
    if (remaining.length === ids.length) {
      notify(failMessage);
      return false;
    }
    setSelection(remaining);
    notify(PHOTO_BOX_MESSAGES.selectionStale(ids.length - remaining.length));
    return true;
  };

  // 고른 사진은 누르는 즉시 목록에서 빠지므로(낙관 처리) 응답을 기다리지 않고 선택 모드를 끝냄
  const confirmDelete = usePreservedCallback(async () => {
    if (pending || !isSelectionCurrent()) return;
    const ids = selection;
    const request = actions.deletePhotos(ids);
    stop();
    // 눌렀던 메뉴·선택 칸이 사라지므로 초점을 옮김
    onDeleted?.();
    // 그 사이 다시 고르기 시작했으면 늦은 실패로 그 선택을 덮지 않음
    const session = sessionRef.current;
    try {
      const { removedCount } = await request;
      if (removedCount > 0) notify(PHOTO_BOX_MESSAGES.deleteDone(removedCount));
    } catch (error) {
      // 빠졌던 사진은 mutation이 되돌림. 바로 다시 시도할 수 있게 선택을 되살림
      const missing = new Set(error instanceof MissingPhotosError ? error.missingIds : []);
      const remaining = ids.filter((id) => !missing.has(id));
      if (session !== sessionRef.current || selectingRef.current) {
        notify(PHOTO_BOX_MESSAGES.deleteFailed);
        return;
      }
      // 초점은 삭제 확정 때 옮긴 제목에 둠(상태 영역이 선택 장수를, 토스트가 실패를 알림)
      setSelecting(true);
      setSelection(remaining);
      // 고른 사진이 그사이 지워졌으면 아무것도 삭제되지 않음: 사라진 사진만 선택에서 빼고 알림(명세 3.3.1)
      notify(
        missing.size > 0
          ? PHOTO_BOX_MESSAGES.selectionStale(ids.length - remaining.length)
          : PHOTO_BOX_MESSAGES.deleteFailed,
      );
    }
  });

  // 여러 장은 전부 성공 또는 전부 실패: 성공하면 선택 모드를 끝내고 토스트, 실패하면 시트를 그대로 둠
  const changeDate = async (date: Date) => {
    const session = sessionRef.current;
    const ids = selection;
    setPending('date');
    try {
      await actions.changePhotoDates(ids, date);
    } catch (error) {
      setPending(undefined);
      if (session !== sessionRef.current) return false;
      // 고른 사진이 그사이 지워졌으면 아무것도 바뀌지 않음: 사라진 사진만 선택에서 빼고 시트는 닫음(사라진 사진을 몰라 일반 실패가 되면 시트를 그대로 둠)
      if (error instanceof MissingPhotosError) {
        return dropMissing(ids, error.missingIds, PHOTO_BOX_MESSAGES.dateChangeFailed);
      }
      notify(PHOTO_BOX_MESSAGES.dateChangeFailed);
      return false;
    }
    setPending(undefined);
    if (session !== sessionRef.current) return true;
    notify(PHOTO_BOX_MESSAGES.dateChanged);
    stop();
    return true;
  };

  // 관리자가 다른 멤버 사진의 날짜를 바꿀 때 거치는 확인(열린 시트 위에 뜸)
  const checkDate = usePreservedCallback(async () => {
    if (pending || !data || !isSelectionCurrent()) return false;
    return (
      !needsDateChangeConfirm(selectedPhotos, data.viewer) ||
      (await askDateChangeConfirm(openOverlay, getDateConfirmKind(selectedPhotos, data.viewer)))
    );
  });

  // 확인 창을 거치는 사이 목록이 바뀔 수 있어 저장할 때의 최신 값으로 다시 확인
  const applyDate = usePreservedCallback(async (date: Date) =>
    isSelectionCurrent() ? changeDate(date) : false,
  );

  return {
    selecting,
    selection,
    /** 저장·날짜 변경 요청이 도는 중(삭제는 기다리지 않음) */
    busy: pending !== undefined,
    saving: pending === 'save',
    start,
    stop,
    toggle,
    handleMenuAction,
  };
}
