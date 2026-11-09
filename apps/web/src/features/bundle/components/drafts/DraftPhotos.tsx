'use client';

import { LineChevronRightMediumIcon } from '@app/design-system';
import {
  AddBundlePhotoEditor,
  BundlePhotoEditor,
  BundleTitle,
  DeleteButton,
  PhotoImportSheet,
} from '@app/design-system/web';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '../../constants/messages';
import { BUNDLE_PATHS } from '../../constants/paths';
import { getPhotoEditors, getRemovePhotoKind, type RemovePhotoKind } from '../../lib/photos';
import { RemovePhotoDialogs } from './RemovePhotoDialogs';

// 확인 창 닫힘 전환이 끝난 뒤에 포커스를 옮기려는 지연
const CLOSE_TRANSITION_MS = 150;

type DraftPhotosProps = {
  draft: Draft;
  viewer: DraftViewer;
  canEdit: boolean;
  onRemovePhoto: (_photoId: string) => void;
  /** 다른 멤버가 편집 중인 사진을 빼려 할 때 */
  onEditingBlocked: () => void;
  /** 사진을 눌렀을 때 */
  onOpenPhoto?: ((_photoId: string) => void) | undefined;
  /** 사진 추가 시트에서 사진함을 골랐을 때(없으면 추가 칸을 숨김) */
  onImportFromBunchBox?: (() => void) | undefined;
  /** 사진 추가 시트에서 갤러리를 골랐을 때(더 올릴 수 있는 장수) */
  onImportFromGallery?: ((_remaining: number) => void) | undefined;
};

/**
 * 사진 가로 목록(Figma `5664:100844`, 130px 칸·간격 10px): 사진을 누르면 사진 화면, X로 빼기, 끝의 칸으로 추가
 * 제목 옆에는 사진을 편집 중인 멤버, 오른쪽에는 「픽하기」 화면으로 가는 링크
 */
export function DraftPhotos({
  draft,
  viewer,
  canEdit,
  onRemovePhoto,
  onEditingBlocked,
  onOpenPhoto,
  onImportFromBunchBox,
  onImportFromGallery,
}: DraftPhotosProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(focusTimer.current), []);
  const [removeDialog, setRemoveDialog] = useState<
    { kind: RemovePhotoKind; photoId: string } | undefined
  >(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const total = draft.photos.length;
  const editors = (draft.editing.photoMemberIds ?? []).flatMap((id) => {
    const member = draft.members.find((candidate) => candidate.id === id);
    return member ? [{ name: member.name, src: member.avatarSrc }] : [];
  });
  const isLocked = (photoId: string) => getPhotoEditors(draft, viewer, photoId).length > 0;
  const removing = draft.photos.find((photo) => photo.id === removeDialog?.photoId);

  const requestRemove = (photoId: string) => {
    if (isLocked(photoId)) return onEditingBlocked();
    setRemoveDialog({ kind: getRemovePhotoKind(draft.photos), photoId });
  };
  const confirmRemove = () => {
    // 확인 창이 떠 있는 사이 다른 멤버가 사진을 빼 한 장만 남았으면 지우지 않고 안내 창으로 바꿈
    if (removing && getRemovePhotoKind(draft.photos) === 'last') {
      setRemoveDialog({ kind: 'last', photoId: removing.id });
      return;
    }
    setRemoveDialog(undefined);
    if (!removing) return;
    // 그 사이 다른 멤버가 편집을 시작했을 수 있어 다시 확인
    if (isLocked(removing.id)) return onEditingBlocked();
    const index = draft.photos.indexOf(removing);
    onRemovePhoto(removing.id);
    setAnnouncement(BUNDLE_MESSAGES.photoRemoved(total - 1));
    // 눌렀던 X가 사라지므로 같은 자리에 온 칸(없으면 마지막 칸)의 첫 버튼으로 초점을 옮김
    clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      const items = listRef.current?.children;
      (items?.[index] ?? items?.[items.length - 1])?.querySelector('button')?.focus();
    }, CLOSE_TRANSITION_MS);
  };

  return (
    <section aria-labelledby="draft-photos-title" className="pt-s13 gap-s3 flex flex-col">
      <div className="px-padding-p8 gap-s4 flex items-center">
        <BundleTitle
          title={BUNDLE_MESSAGES.photosTitle}
          titleId="draft-photos-title"
          icon={false}
          members={editors}
          membersLabel="편집 중인 멤버"
          className="min-w-0 flex-1"
        />
        {total > 0 && (
          <Link
            href={BUNDLE_PATHS.pick(draft.id)}
            className="typography-caption-1-regular text-text-quaternary focus-visible:outline-border-brand relative flex shrink-0 touch-manipulation items-center before:absolute before:-inset-x-2 before:-inset-y-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {BUNDLE_MESSAGES.pickLink}
            <LineChevronRightMediumIcon aria-hidden="true" />
          </Link>
        )}
      </div>
      {/* 모서리 X의 터치 영역과 초점 링이 잘리지 않도록 위아래 여백을 주고 그만큼 당김 */}
      <ul
        ref={listRef}
        className="gap-s5 px-padding-p8 -my-3 flex scrollbar-none overflow-x-auto py-3 [&::-webkit-scrollbar]:hidden"
      >
        {draft.photos.map((photo, index) => (
          <li key={photo.id} className="relative shrink-0">
            <BundlePhotoEditor src={photo.src} alt={photo.alt} size="xs" />
            {onOpenPhoto && (
              <button
                type="button"
                aria-label={BUNDLE_MESSAGES.photoOpenLabel(index + 1)}
                onClick={() => onOpenPhoto(photo.id)}
                className="rounded-r4 focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2"
              />
            )}
            {canEdit && (
              <DeleteButton
                label={BUNDLE_MESSAGES.removePhotoLabel(index + 1)}
                onClick={() => requestRemove(photo.id)}
                className="absolute -top-1 -right-1 z-10"
              />
            )}
          </li>
        ))}
        {canEdit && total < MAX_PHOTOS && onImportFromBunchBox && (
          <li className="shrink-0">
            <AddBundlePhotoEditor size="xs" onClick={() => setImportOpen(true)} />
          </li>
        )}
      </ul>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <PhotoImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onSelectBunchBox={() => {
          setImportOpen(false);
          onImportFromBunchBox?.();
        }}
        onSelectGallery={() => {
          setImportOpen(false);
          onImportFromGallery?.(MAX_PHOTOS - total);
        }}
      />
      <RemovePhotoDialogs
        kind={removeDialog?.kind}
        picked={(removing?.pickedBy?.length ?? 0) > 0}
        onClose={() => setRemoveDialog(undefined)}
        onConfirm={confirmRemove}
      />
    </section>
  );
}
