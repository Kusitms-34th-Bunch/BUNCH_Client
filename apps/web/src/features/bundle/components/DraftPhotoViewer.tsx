'use client';

import { Header, LineChevronLeftLargeIcon, LineDotsLargeIcon, toast } from '@app/design-system';
import { IconButton } from '@app/design-system/web';
import { useEffect, useRef, useState } from 'react';
import type { PhotoBoxMember, PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import {
  PhotoDetailMenu,
  type PhotoDetailMenuAction,
} from '@/features/photo-box/components/PhotoDetailMenu';
import { PhotoViewerSwiper } from '@/features/photo-box/components/PhotoViewerSwiper';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import { usePhotoViewer } from '@/features/photo-box/hooks/usePhotoViewer';
import { formatDetailDate } from '@/features/photo-box/lib/photoDetail';
import { getViewerHeaderClass } from '@/features/photo-box/lib/photoViewerStyle';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import type { DraftActions } from '../hooks/useDraft';
import type { Draft, DraftPhoto, DraftViewer } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { getDraftAccess } from '../lib/permissions';
import { getPhotoEditors, getRemovePhotoKind } from '../lib/photos';
import { RemovePhotoDialogs } from './RemovePhotoDialogs';

// 확인 창 닫힘 전환이 끝난 뒤에 포커스를 옮기려는 지연
const CLOSE_TRANSITION_MS = 150;
// 앨범 저장 API 연결 전의 목 저장 시간: 저장 중에는 화면 전체에 딤과 로딩 점을 보임(화면설계서 5번 「저장 진행 중 로딩 애니메이션」)
const MOCK_SAVE_MS = 900;

const notify = (message: string) => toast(message, { fullWidth: true });

// 크게 보기 슬라이드가 쓰는 사진함 사진 모양으로 바꿈(번들 사진은 항상 보이는 상태)
const toViewerPhoto = (photo: DraftPhoto): PhotoBoxPhoto => ({
  id: photo.id,
  src: photo.src,
  alt: photo.alt,
  takenAt: photo.takenAt,
  uploadedAt: photo.takenAt ?? '',
  uploaderIds: [photo.uploaderId],
  status: 'ready',
});

type DraftPhotoViewerProps = {
  draft: Draft;
  viewer: DraftViewer;
  actions: Pick<DraftActions, 'removePhoto'>;
  /** 처음 보여 줄 사진 id */
  initialPhotoId: string;
  /** 날짜 형식(올해 여부)의 기준 연도. 기본은 올해 */
  currentYear?: number | undefined;
  onBack: () => void;
  /** 다른 사진으로 넘어갔을 때(주소를 맞추는 호출 지점) */
  onPhotoChange: (_photoId: string) => void;
};

/**
 * 번들 사진 크게 보기(Figma `1782:32882`·`1782:32912`, 기능 spec 4.3.6): 헤더에 촬영 날짜와 ⋯, 원본 비율 사진과 올린 멤버 배지
 * 좌우로 번들 순서대로 넘기고, 한 번 누르거나 확대하면 헤더와 배지를 숨김. ⋯ 메뉴는 「저장」과 참여 멤버의 「삭제」(캡션 화면 X와 같은 빼기)
 * 빼면 이웃 사진으로 이어서 보여 줌. 사진 넘기기·헤더 숨김은 `usePhotoViewer`·`PhotoViewerSwiper`가 맡음
 */
export function DraftPhotoViewer({
  draft,
  viewer,
  actions,
  initialPhotoId,
  currentYear = new Date().getFullYear(),
  onBack,
  onPhotoChange,
}: DraftPhotoViewerProps) {
  const access = getDraftAccess(draft, viewer);
  const photos = draft.photos;
  const viewerPhotos = photos.map(toViewerPhoto);
  const members: readonly PhotoBoxMember[] = draft.members.map((member) => ({
    id: member.id,
    name: member.name,
    avatarSrc: member.avatarSrc,
  }));
  // 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  // 확인 창을 연 시점의 사진 id를 고정해 그 사이 넘겨져도 다른 사진을 빼지 않음
  const [removeDialog, setRemoveDialog] = useState<
    { kind: 'last' | 'captioned'; photoId: string } | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(focusTimer.current);
      clearTimeout(saveTimer.current);
    },
    [],
  );

  const photoViewer = usePhotoViewer({
    photos,
    initialPhotoId,
    onPhotoChange,
    keyboardBlocked: menuOpen || removeDialog !== undefined || saving,
  });
  const { activeId, activeIndex, chromeHidden, showPhoto } = photoViewer;
  const activePhoto = photos[activeIndex];

  const toggleMenu = () => {
    setMenuMounted(true);
    setMenuOpen((open) => !open);
  };

  // 빼고 나면 같은 자리에 온 다음 사진(마지막이었으면 앞 사진)을 이어서 보여 줌
  const removeAndContinue = (photoId: string) => {
    const index = photos.findIndex((photo) => photo.id === photoId);
    const neighbor = photos[index + 1] ?? photos[index - 1];
    actions.removePhoto(photoId);
    if (neighbor && photoId === activeId) showPhoto(neighbor.id);
    // 빼면 메뉴를 연 ⋯ 근처에서 계속 쓰도록 포커스를 ⋯로 돌림(확인 창은 닫힌 뒤)
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => menuTriggerRef.current?.focus(), CLOSE_TRANSITION_MS);
  };

  const requestRemove = () => {
    if (!activePhoto) return;
    if (!access.canEdit) return notify(BUNDLE_MESSAGES.editOnlyParticipants);
    if (getPhotoEditors(draft, viewer, activePhoto.id).length > 0) {
      return notify(BUNDLE_MESSAGES.editingBlocked);
    }
    const kind = getRemovePhotoKind(photos, activePhoto);
    if (kind === 'direct') removeAndContinue(activePhoto.id);
    else setRemoveDialog({ kind, photoId: activePhoto.id });
  };

  // 저장 중에는 딤과 로딩 점을 보이고 끝나면 완료 토스트(앨범 저장 API 연결 전에는 목 지연)
  const save = () => {
    setSaving(true);
    saveTimer.current = setTimeout(() => {
      setSaving(false);
      notify(PHOTO_BOX_MESSAGES.saveDone);
    }, MOCK_SAVE_MS);
  };

  const handleMenuSelect = (action: PhotoDetailMenuAction) => {
    if (saving) return;
    if (action === 'save') save();
    else if (action === 'delete') requestRemove();
  };

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
                aria-disabled={saving ? true : undefined}
                onClick={saving ? undefined : toggleMenu}
              >
                <LineDotsLargeIcon aria-hidden="true" />
              </IconButton>
            }
          />
          {menuMounted ? (
            <div className="right-s8 absolute top-full z-20">
              <PhotoDetailMenu
                canManage={access.canEdit}
                withDate={false}
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
      <h1 className="sr-only">{BUNDLE_MESSAGES.photoViewerTitle}</h1>
      <p role="status" className="sr-only">
        {saving
          ? PHOTO_BOX_MESSAGES.saving
          : BUNDLE_MESSAGES.photoPosition(activeIndex + 1, photos.length)}
      </p>
      {/* 저장 중에는 사진 영역을 inert로 막음(⋯가 포커스를 잃지 않도록 헤더는 열어 둠) */}
      <PhotoViewerSwiper
        viewer={photoViewer}
        photos={viewerPhotos}
        members={members}
        inert={saving}
      />
      {saving ? <PageLoading /> : null}
      <RemovePhotoDialogs
        kind={removeDialog?.kind}
        onClose={() => setRemoveDialog(undefined)}
        onConfirm={() => {
          // 확인 창이 떠 있는 사이 다른 멤버가 편집을 시작했거나 사진이 이미 빠졌을 수 있어 다시 확인
          if (removeDialog && photos.some((photo) => photo.id === removeDialog.photoId)) {
            if (getPhotoEditors(draft, viewer, removeDialog.photoId).length > 0) {
              notify(BUNDLE_MESSAGES.editingBlocked);
            } else {
              removeAndContinue(removeDialog.photoId);
            }
          }
          setRemoveDialog(undefined);
        }}
      />
    </PageShell>
  );
}
