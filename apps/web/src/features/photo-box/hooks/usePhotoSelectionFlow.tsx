import { toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { PhotoBoxActions, PhotoBoxData, SaveResult } from '../lib/types';
import { DateChangeConfirmDialog, DeleteConfirmDialog } from '../components/PhotoSelectionDialogs';
import { SavingDateSheet } from '../components/SavingDateSheet';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import {
  MAX_BUNDLE_PHOTOS,
  canDeletePhotos,
  getDeleteKind,
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
  /** 「번들 만들기」 확인 뒤 호출(초안 생성과 편집 화면 이동은 번들 작성 이슈가 맡음) */
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
  const [selection, setSelection] = useState<PhotoSelection>(() => [...(resumed ?? [])]);

  const [pending, setPending] = useState<'save' | 'delete' | 'date' | undefined>(undefined);
  const noData = !data;
  // 목록이 준비되면(화면이 이때 다시 마운트되기도 함) 이어 간 선택을 비워, 다음에 사진함을 열 때 선택 모드가 남지 않게 함
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
      const description = PHOTO_BOX_MESSAGES.deleteConfirmDescription(deleteKind ?? 'own');
      openOverlay((rootProps, close) => (
        <DeleteConfirmDialog
          {...rootProps}
          description={description}
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

  const confirmDelete = usePreservedCallback(async () => {
    if (pending || !isSelectionCurrent()) return;
    const session = sessionRef.current;
    setPending('delete');
    try {
      const { removedCount } = await actions.deletePhotos(selection);
      setPending(undefined);
      if (session !== sessionRef.current) return;
      if (removedCount > 0) {
        notify(PHOTO_BOX_MESSAGES.deleteDone(removedCount));
      }
      stop();
      // 0장이어도 선택 모드는 끝나 눌렀던 선택 칸이 사라지므로 초점을 옮김
      onDeleted?.();
    } catch {
      setPending(undefined);
      // 실패하면 선택을 그대로 두어 바로 다시 시도할 수 있게 함
      if (session === sessionRef.current) notify(PHOTO_BOX_MESSAGES.deleteFailed);
    }
  });

  // 여러 장은 전부 성공 또는 전부 실패: 성공하면 선택 모드를 끝내고 토스트, 실패하면 시트를 그대로 둠
  const changeDate = async (date: Date) => {
    const session = sessionRef.current;
    setPending('date');
    try {
      await actions.changePhotoDates(selection, date);
    } catch {
      setPending(undefined);
      if (session === sessionRef.current) notify(PHOTO_BOX_MESSAGES.dateChangeFailed);
      return false;
    }
    setPending(undefined);
    if (session !== sessionRef.current) return true;
    notify(PHOTO_BOX_MESSAGES.dateChanged);
    stop();
    return true;
  };

  // 관리자가 다른 멤버 사진의 날짜를 바꿀 때 거치는 확인(열린 시트 위에 뜸)
  const askDateConfirm = () =>
    new Promise<boolean>((resolve) => {
      openOverlay(
        (rootProps, close) => (
          <DateChangeConfirmDialog
            {...rootProps}
            onConfirm={() => {
              resolve(true);
              close();
            }}
          />
        ),
        () => resolve(false),
      );
    });

  const checkDate = usePreservedCallback(async () => {
    if (pending || !data || !isSelectionCurrent()) return false;
    return !needsDateChangeConfirm(selectedPhotos, data.viewer) || (await askDateConfirm());
  });

  // 확인 창을 거치는 사이 목록이 바뀔 수 있어 저장할 때의 최신 값으로 다시 확인
  const applyDate = usePreservedCallback(async (date: Date) =>
    isSelectionCurrent() ? changeDate(date) : false,
  );

  return {
    selecting,
    selection,
    /** 저장·삭제·날짜 변경 요청이 도는 중 */
    busy: pending !== undefined,
    saving: pending === 'save',
    start,
    stop,
    toggle,
    handleMenuAction,
  };
}
