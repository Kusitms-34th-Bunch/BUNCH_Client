'use client';

import { LineChevronRightMediumIcon } from '@app/design-system';
import {
  AddBundlePhotoEditor,
  BundlePhotoEditor,
  BundleTitle,
  PhotoImportSheet,
} from '@app/design-system/web';
import { useRef, useState } from 'react';
import type { DraftAccess } from '../../lib/permissions';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '../../constants/messages';
import { getRemovePhotoKind, getPhotoEditors, type RemovePhotoKind } from '../../lib/photos';
import { RemovePhotoDialogs } from './RemovePhotoDialogs';

type DraftPhotosProps = {
  draft: Draft;
  viewer: DraftViewer;
  access: DraftAccess;
  /** 사진 삭제 확정 */
  onRemovePhoto: (_photoId: string) => void;
  /** 참여 멤버가 아니라 고칠 수 없을 때 */
  onDenied: () => void;
  /** 다른 멤버가 그 사진을 편집 중일 때 */
  onEditingBlocked: () => void;
  /** 사진을 눌렀을 때(사진 상세로 이동) */
  onOpenPhoto?: ((_photoId: string) => void) | undefined;
  /** 「픽하기 >」를 눌렀을 때(대표 사진 투표 화면으로 이동) */
  onOpenPick?: (() => void) | undefined;
  /** 사진 추가 시트의 「번치 사진함에서 가져오기」 */
  onImportFromBunchBox: () => void;
  /** 사진 추가 시트의 「내 갤러리에서 가져오기」(더 담을 수 있는 장수와 함께) */
  onImportFromGallery: (_maxCount: number) => void;
};

/**
 * 사진 가로 목록(Figma `5367:146358`): 130px 정사각 사진이 가로로 이어지고, 사진마다 오른쪽 위 X(삭제), 맨 끝에 「사진 추가」 타일
 * 제목 줄 오른쪽 「픽하기 >」는 대표 사진 투표 화면으로 가고, 사진을 누르면 사진 상세로 감(캡션은 이 화면에서 보이지 않음)
 * 「사진 추가」는 초안 생성자·관리자·공동 관리자에게만 보이고(20장이면 숨김), 삭제는 참여 멤버가 할 수 있으며 마지막 한 장은 지울 수 없음
 */
export function DraftPhotos({
  draft,
  viewer,
  access,
  onRemovePhoto,
  onDenied,
  onEditingBlocked,
  onOpenPhoto,
  onOpenPick,
  onImportFromBunchBox,
  onImportFromGallery,
}: DraftPhotosProps) {
  const total = draft.photos.length;
  const [importOpen, setImportOpen] = useState(false);
  // 시트 선택이 두 번 처리되지 않게(닫히는 동안 다시 눌러도 한 번만)
  const importChosen = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);
  // 확인 창을 연 시점의 사진 id를 고정해 그 사이 목록이 바뀌어도 다른 사진을 지우지 않음
  const [removeDialog, setRemoveDialog] = useState<
    { kind: RemovePhotoKind; photoId: string } | undefined
  >(undefined);

  // 라벨 옆: 사진을 편집 중인 멤버 전체(어느 사진인지는 알려 주지 않음)
  const editors = (draft.editing.photoMemberIds ?? []).flatMap((id) => {
    const member = draft.members.find((candidate) => candidate.id === id);
    return member ? [{ name: member.name, src: member.avatarSrc }] : [];
  });

  const requestRemove = (photoId: string) => {
    if (!access.canEdit) return onDenied();
    if (getPhotoEditors(draft, viewer, photoId).length > 0) return onEditingBlocked();
    setRemoveDialog({ kind: getRemovePhotoKind(draft.photos), photoId });
  };

  return (
    <section aria-labelledby="draft-photos-title" className="pt-s15 gap-s3 flex flex-col">
      <div className="px-padding-p8 flex items-center">
        <BundleTitle
          title={BUNDLE_MESSAGES.photosTitle}
          titleId="draft-photos-title"
          icon={false}
          members={editors}
          membersLabel="편집 중인 멤버"
          className="min-w-0 flex-1"
        />
        {onOpenPick ? (
          <button
            type="button"
            onClick={onOpenPick}
            className="typography-body-4-regular text-text-tertiary gap-s1 focus-visible:outline-border-brand -mr-s2 rounded-r4 flex shrink-0 cursor-pointer touch-manipulation items-center focus-visible:outline-2"
          >
            {BUNDLE_MESSAGES.pickLink}
            <LineChevronRightMediumIcon aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <ul
        ref={listRef}
        className="gap-s5 px-padding-p8 flex scrollbar-none overflow-x-auto pt-1 [&::-webkit-scrollbar]:hidden"
      >
        {draft.photos.map((photo, index) => (
          <li key={photo.id} className="relative shrink-0">
            {/* 사진 전체를 누르는 버튼은 아래에 두고, 사진 틀은 X만 눌리게 해서 X와 사진 누르기가 겹치지 않음 */}
            {onOpenPhoto ? (
              <button
                type="button"
                aria-label={BUNDLE_MESSAGES.photoOpenLabel(index + 1)}
                onClick={() => onOpenPhoto(photo.id)}
                className="rounded-r4 focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2"
              />
            ) : null}
            <BundlePhotoEditor
              src={photo.src}
              alt={photo.alt}
              size="xs"
              className="pointer-events-none [&_button]:pointer-events-auto"
              deleteLabel={BUNDLE_MESSAGES.removePhotoLabel(index + 1)}
              onDelete={() => requestRemove(photo.id)}
            />
          </li>
        ))}
        {access.canAddPhoto && total < MAX_PHOTOS ? (
          <li className="shrink-0">
            <AddBundlePhotoEditor
              size="xs"
              onClick={() => {
                importChosen.current = false;
                setImportOpen(true);
              }}
            />
          </li>
        ) : null}
      </ul>
      <p role="status" className="sr-only">
        {BUNDLE_MESSAGES.photoCount(total)}
      </p>
      <PhotoImportSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        onSelectBunchBox={() => {
          if (importChosen.current) return;
          importChosen.current = true;
          setImportOpen(false);
          onImportFromBunchBox();
        }}
        onSelectGallery={() => {
          if (importChosen.current) return;
          importChosen.current = true;
          setImportOpen(false);
          onImportFromGallery(MAX_PHOTOS - total);
        }}
      />
      <RemovePhotoDialogs
        kind={removeDialog?.kind}
        onClose={() => setRemoveDialog(undefined)}
        onConfirm={() => {
          if (removeDialog) onRemovePhoto(removeDialog.photoId);
          setRemoveDialog(undefined);
          // 지운 사진의 X에 있던 포커스가 사라지므로 목록의 첫 버튼으로 옮김(상태가 반영된 다음 그림)
          requestAnimationFrame(() =>
            listRef.current?.querySelector<HTMLElement>('button')?.focus(),
          );
        }}
      />
    </section>
  );
}
