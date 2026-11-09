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
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft, DraftPhoto, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { getDraftAccess } from '../../lib/permissions';
import { getPhotoEditors, getRemovePhotoKind, type RemovePhotoKind } from '../../lib/photos';
import { RemovePhotoDialogs } from './RemovePhotoDialogs';

// 확인 창 닫힘 전환이 끝난 뒤에 포커스를 옮기려는 지연
const CLOSE_TRANSITION_MS = 150;
// 앨범 저장 API 연결 전의 목 저장 시간: 저장 중에는 화면 전체에 딤과 로딩 점을 보임(화면설계서 5번 「저장 진행 중 로딩 애니메이션」)
const MOCK_SAVE_MS = 900;

const notify = (message: string) => toast(message, { fullWidth: true });

// 크게 보기 슬라이드가 쓰는 사진함 사진 모양으로 바꿈(번들 사진은 항상 보이는 상태)
// 배지와 헤더 날짜는 사진함 원본의 올린 멤버·촬영 날짜를 씀(번들 사진의 `uploaderId`는 번들에 담은 사람이라 사진 소유자가 아님)
const toViewerPhoto = (photo: DraftPhoto, source: PhotoSource | undefined): PhotoBoxPhoto => {
  const takenAt = source ? source.takenAt : photo.takenAt;
  return {
    id: photo.id,
    src: photo.src,
    alt: photo.alt,
    takenAt,
    uploadedAt: takenAt ?? '',
    uploaderIds: source ? source.uploaderIds : [photo.uploaderId],
    status: 'ready',
  };
};

/** 번들 사진의 사진함 원본에서 가져온 촬영 날짜와 올린 멤버 */
export type PhotoSource = Pick<PhotoBoxPhoto, 'takenAt' | 'uploaderIds'>;

const UNKNOWN_SOURCE: PhotoSource = { takenAt: null, uploaderIds: [] };

type DraftPhotoViewerProps = {
  draft: Draft;
  viewer: DraftViewer;
  actions: Pick<DraftActions, 'removePhoto'>;
  /** 처음 보여 줄 사진 id */
  initialPhotoId: string;
  /** 사진함 원본 사진 id별 촬영 날짜·올린 멤버. 없으면 번들에 담은 사람과 날짜 없음으로 보임 */
  sources?: ReadonlyMap<string, PhotoSource> | undefined;
  /** 사진함 데이터를 받는 중이면 배지와 헤더 날짜를 비워 둠(사진 보기와 삭제는 막지 않음) */
  sourcesPending?: boolean | undefined;
  /** 올린 멤버를 찾을 번치 멤버(번들 참여자가 아닌 소유자도 포함). 없으면 번들 참여자 */
  bunchMembers?: readonly PhotoBoxMember[] | undefined;
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
  sources,
  sourcesPending = false,
  bunchMembers,
  currentYear = new Date().getFullYear(),
  onBack,
  onPhotoChange,
}: DraftPhotoViewerProps) {
  const access = getDraftAccess(draft, viewer);
  const photos = draft.photos;
  // 사진함 데이터를 받는 동안과 받은 뒤 원본이 없는 사진은 배지·날짜를 비움(번들에 담은 사람을 소유자로 잘못 보이지 않게)
  // 사진함 데이터를 받지 못한 경우(`sources` 없음)만 번들에 담은 사람·번들의 날짜로 보임
  const viewerPhotos = photos.map((photo) => {
    if (sourcesPending) return toViewerPhoto(photo, UNKNOWN_SOURCE);
    if (!sources) return toViewerPhoto(photo, undefined);
    return toViewerPhoto(
      photo,
      (photo.sourcePhotoId ? sources.get(photo.sourcePhotoId) : undefined) ?? UNKNOWN_SOURCE,
    );
  });
  const members: readonly PhotoBoxMember[] =
    bunchMembers ??
    draft.members.map((member) => ({
      id: member.id,
      name: member.name,
      avatarSrc: member.avatarSrc,
    }));
  // 메뉴는 닫히는 모션이 끝날 때까지 화면에 남기므로 열림과 마운트를 따로 둠
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  // 확인 창을 연 시점의 사진 id를 고정해 그 사이 넘겨져도 다른 사진을 빼지 않음
  const [removeDialog, setRemoveDialog] = useState<
    { kind: RemovePhotoKind; photoId: string } | undefined
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
    setRemoveDialog({ kind: getRemovePhotoKind(photos), photoId: activePhoto.id });
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
            title={
              sourcesPending
                ? ''
                : formatDetailDate(viewerPhotos[activeIndex]?.takenAt ?? null, currentYear)
            }
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
        picked={
          (photos.find((photo) => photo.id === removeDialog?.photoId)?.pickedBy?.length ?? 0) > 0
        }
        onClose={() => setRemoveDialog(undefined)}
        onConfirm={() => {
          // 확인 창이 떠 있는 사이 다른 멤버가 편집을 시작했거나 사진이 이미 빠졌을 수 있어 다시 확인
          if (removeDialog && photos.some((photo) => photo.id === removeDialog.photoId)) {
            if (getPhotoEditors(draft, viewer, removeDialog.photoId).length > 0) {
              notify(BUNDLE_MESSAGES.editingBlocked);
            } else if (getRemovePhotoKind(photos) === 'last') {
              // 그 사이 다른 멤버가 사진을 빼 한 장만 남았으면 지우지 않고 안내 창으로 바꿈
              setRemoveDialog({ kind: 'last', photoId: removeDialog.photoId });
              return;
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
