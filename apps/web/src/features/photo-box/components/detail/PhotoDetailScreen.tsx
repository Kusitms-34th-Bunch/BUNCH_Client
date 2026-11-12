'use client';

import { Header, LineChevronLeftLargeIcon, LineDotsLargeIcon, toast } from '@app/design-system';
import { IconButton } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type {
  PhotoBoxActions,
  PhotoBoxMember,
  PhotoBoxPhoto,
  PhotoBoxViewer,
  SaveResult,
} from '../../lib/types';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { usePhotoViewer } from '../../hooks/usePhotoViewer';
import { useSaveBlockedNotice } from '../../hooks/useSaveBlockedNotice';
import { MissingPhotosError } from '../../lib/missingPhotos';
import {
  canDeletePhotos,
  countCoUploaded,
  getDateConfirmKind,
  getDeleteKind,
  type DateConfirmKind,
} from '../../lib/photoActions';
import { formatDetailDate } from '../../lib/photoDetail';
import { getViewerHeaderClass } from '../../lib/photoViewerStyle';
import { PhotoDetailMenu, type PhotoDetailMenuAction } from '../PhotoDetailMenu';
import { DateChangeConfirmDialog, DeleteConfirmDialog } from '../PhotoSelectionDialogs';
import { PhotoViewerSwiper } from '../PhotoViewerSwiper';
import { SavingDateSheet } from '../SavingDateSheet';

type PhotoDetailScreenProps = {
  /** 사진함 순서(`getDetailOrder`)로 정렬된 사진 */
  photos: readonly PhotoBoxPhoto[];
  members: readonly PhotoBoxMember[];
  viewer: PhotoBoxViewer;
  /** 처음 보여 줄 사진 id */
  initialPhotoId: string;
  actions: PhotoBoxActions;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onBack: () => void;
  /** 사진이 사라지게 삭제해 사진함으로 돌아갈 때 */
  onLeave: () => void;
  /** 다른 사진으로 넘어갔을 때(주소를 맞추는 호출 지점) */
  onPhotoChange?: ((_photoId: string) => void) | undefined;
};

// 사진함 토스트는 목록 폭(343px)으로 펼침(Figma 사진함_18)
const notify = (message: string) => toast(message);

/**
 * 사진 상세 화면: 헤더(뒤로·촬영 날짜·더보기), 좌우로 넘기는 큰 사진과 올린 멤버 배지, 더보기 메뉴(저장·날짜 바꾸기·삭제)
 * 한 번 누르거나 확대하면 헤더와 배지를 서서히 숨기고 다시 누르면 보이며, 숨긴 상태는 사진을 넘겨도 유지
 */
export function PhotoDetailScreen({
  photos,
  members,
  viewer,
  initialPhotoId,
  actions,
  currentYear = new Date().getFullYear(),
  onBack,
  onLeave,
  onPhotoChange,
}: PhotoDetailScreenProps) {
  // 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const openOverlay = useScreenOverlay();
  const notifySaveBlocked = useSaveBlockedNotice();
  // 시트·확인 창이 떠 있는 동안 방향키로 넘기지 않음
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [pending, setPending] = useState<'save' | 'delete' | 'date' | undefined>(undefined);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  // 사진 넘기기·헤더 숨김·Swiper 보정은 `usePhotoViewer`가 맡음. 메뉴·확인 창·요청 중에는 방향키로 넘기지 않음
  const photoViewer = usePhotoViewer({
    photos,
    initialPhotoId,
    onPhotoChange,
    keyboardBlocked: menuOpen || overlayOpen || pending !== undefined,
  });
  const { activeIndex, chromeHidden } = photoViewer;
  const activePhoto = photos[activeIndex];
  const canManage = activePhoto ? canDeletePhotos([activePhoto], viewer) : false;

  const toggleMenu = () => {
    setMenuMounted(true);
    setMenuOpen((open) => !open);
  };

  const save = async () => {
    if (!activePhoto) return;
    setPending('save');
    let failed = false;
    let blocked: SaveResult['blocked'];
    try {
      const result = await actions.savePhotos([activePhoto.id]);
      failed = result.failedIds.length > 0;
      blocked = result.blocked;
    } catch {
      failed = true;
    }
    setPending(undefined);
    // 저장을 시도하지 못했으면(권한 거부 등) 실패 토스트 대신 이유를 안내
    if (blocked) {
      notifySaveBlocked(blocked, {
        onOpened: () => setOverlayOpen(true),
        onClosed: () => setOverlayOpen(false),
      });
      return;
    }
    notify(failed ? PHOTO_BOX_MESSAGES.saveFailedAll : PHOTO_BOX_MESSAGES.saveDone);
  };

  // 시트의 「저장」: 성공하면 시트를 닫고 토스트를 띄우며, 실패하면 시트를 그대로 둠(기능 spec 3.4.1)
  const changeDate = async (targetId: string, date: Date) => {
    setPending('date');
    try {
      await actions.changePhotoDates([targetId], date);
      setPending(undefined);
      notify(PHOTO_BOX_MESSAGES.dateChanged);
      return true;
    } catch (error) {
      setPending(undefined);
      // 보던 사진이 그사이 지워졌으면 사진함으로 돌아가 안내(시트도 함께 닫힘)
      if (error instanceof MissingPhotosError) {
        toastAfterNavigation(PHOTO_BOX_MESSAGES.deletedPhoto);
        onLeave();
        return true;
      }
      notify(PHOTO_BOX_MESSAGES.dateChangeFailed);
      return false;
    }
  };

  const confirmDelete = async (targetId: string) => {
    setPending('delete');
    try {
      const { removedCount } = await actions.deletePhotos([targetId]);
      setPending(undefined);
      if (removedCount > 0) {
        // 사진이 사라지면 사진함으로 돌아가 삭제 토스트, 내 배지만 빠지면 상세에 머묾
        toastAfterNavigation(PHOTO_BOX_MESSAGES.deleteDone(removedCount));
        onLeave();
      }
    } catch (error) {
      setPending(undefined);
      // 보던 사진이 그사이 지워졌으면 사진함으로 돌아가 안내
      if (error instanceof MissingPhotosError) {
        toastAfterNavigation(PHOTO_BOX_MESSAGES.deletedPhoto);
        onLeave();
        return;
      }
      notify(PHOTO_BOX_MESSAGES.deleteFailed);
    }
  };

  // 관리자가 다른 멤버 사진의 날짜를 바꿀 때 거치는 확인(열린 시트 위에 뜸, 기능명세서 3.4.1)
  const askDateConfirm = (kind: DateConfirmKind) =>
    new Promise<boolean>((resolve) => {
      openOverlay(
        (rootProps, close) => (
          <DateChangeConfirmDialog
            {...rootProps}
            kind={kind}
            onConfirm={() => {
              resolve(true);
              close();
            }}
          />
        ),
        () => resolve(false),
      );
    });

  const handleMenuSelect = (action: PhotoDetailMenuAction) => {
    if (pending || !activePhoto) return;
    if (action === 'save') void save();
    else if (action === 'date') {
      // 연 시점의 사진 id를 고정해 시트가 열린 사이 사진이 넘어가도 처음 사진의 날짜를 바꿈
      // 시트는 사진의 원래 날짜와 관계없이 항상 오늘이 속한 달을 선택 없이 엶(기능명세서 3.4.1)
      const photo = activePhoto;
      const confirmKind = getDateConfirmKind([photo], viewer);
      setOverlayOpen(true);
      openOverlay(
        (rootProps, close) => (
          <SavingDateSheet
            {...rootProps}
            close={close}
            beforeSave={confirmKind ? () => askDateConfirm(confirmKind) : undefined}
            save={(date) => changeDate(photo.id, date)}
          />
        ),
        () => setOverlayOpen(false),
      );
    } else if (canManage) {
      // 연 시점의 사진 id를 고정해 그 사이 넘겨져도 다른 사진을 지우지 않음
      const { id } = activePhoto;
      const { title, lines } = PHOTO_BOX_MESSAGES.deleteConfirm(
        getDeleteKind([activePhoto], viewer),
        1,
        countCoUploaded([activePhoto]),
      );
      setOverlayOpen(true);
      openOverlay(
        (rootProps, close) => (
          <DeleteConfirmDialog
            {...rootProps}
            title={title}
            lines={lines}
            onConfirm={() => {
              close();
              void confirmDelete(id);
            }}
          />
        ),
        () => setOverlayOpen(false),
      );
    } else notify(PHOTO_BOX_MESSAGES.deleteForbidden);
  };

  const noPhoto = !activePhoto;
  // 화면 상태가 바뀌어(보던 사진이 사라짐) 창이 의미를 잃으면 모두 닫음
  useEffect(() => {
    if (noPhoto) openOverlay.closeAll();
  }, [noPhoto, openOverlay]);

  if (!activePhoto) return null;

  return (
    <PageShell
      header={
        <div className={getViewerHeaderClass(chromeHidden)}>
          <Header
            leading={
              <HeaderIconButton label="뒤로 가기" onClick={onBack}>
                <LineChevronLeftLargeIcon aria-hidden="true" />
              </HeaderIconButton>
            }
            title={formatDetailDate(activePhoto.takenAt, currentYear)}
            trailing={
              <IconButton
                ref={menuTriggerRef}
                aria-label="더보기"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-disabled={pending ? true : undefined}
                onClick={pending ? undefined : toggleMenu}
              >
                <LineDotsLargeIcon aria-hidden="true" />
              </IconButton>
            }
          />
          {menuMounted ? (
            <div className="right-s8 absolute top-full z-20">
              <PhotoDetailMenu
                canManage={canManage}
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onExited={() => setMenuMounted(false)}
                onSelect={handleMenuSelect}
                triggerRef={menuTriggerRef}
              />
            </div>
          ) : null}
        </div>
      }
    >
      <h1 className="sr-only">사진 상세</h1>
      <p role="status" className="sr-only">
        {pending === 'save' ? PHOTO_BOX_MESSAGES.saving : null}
        {pending === 'delete' ? PHOTO_BOX_MESSAGES.deleting : null}
        {pending === 'save' || pending === 'delete'
          ? null
          : PHOTO_BOX_MESSAGES.detailPosition(activeIndex + 1, photos.length)}
      </p>
      {/* 저장·삭제 중에는 사진 영역을 inert로 막음(더보기가 포커스를 잃지 않도록 헤더는 열어 둠) */}
      <PhotoViewerSwiper
        viewer={photoViewer}
        photos={photos}
        members={members}
        inert={pending !== undefined}
      />
      {pending === 'save' || pending === 'delete' ? <PageLoading /> : null}
    </PageShell>
  );
}
