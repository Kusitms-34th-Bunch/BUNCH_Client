'use client';

import { cn } from '@app/design-system';
import { BundlePhoto, BundleTitle } from '@app/design-system/web';
import { type ReactNode, useState } from 'react';
import { EditingLottie } from '@/shared/components/loading/EditingLottie';
import type { Draft } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';

// BundlePhoto `s`(300px)와 사진 사이 간격 12px: 가로로 넘긴 거리를 사진 번호로 바꾸는 기준
const PHOTO_STEP = 300 + 12;

const CAPTION_ROW = 'px-padding-p8 py-padding-p1 flex h-11.5 items-center overflow-hidden';

/** 캡션 줄: 열 수 있으면 눌러 캡션 화면으로 가는 버튼, 아니면 글자만 */
function CaptionRow({
  onOpen,
  children,
}: {
  onOpen: (() => void) | undefined;
  children: ReactNode;
}) {
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className={cn(CAPTION_ROW, 'w-full cursor-pointer touch-manipulation text-left')}
    >
      {children}
    </button>
  ) : (
    <div className={CAPTION_ROW}>{children}</div>
  );
}

type DraftPhotosProps = {
  draft: Draft;
  /** 다른 멤버가 사진·캡션을 편집 중일 때 캡션 줄을 눌렀을 때 */
  onEditingBlocked: () => void;
  /** 사진이나 캡션을 눌렀을 때(캡션 화면으로 이동) */
  onOpenPhoto?: ((_photoId: string) => void) | undefined;
};

/**
 * 사진 가로 목록(옆 사진이 일부 보임)과 가운데 사진의 캡션(높이 46px 고정, 2줄까지, 넘치면 「…」, 없으면 「캡션 추가...」)
 * 다른 멤버가 편집 중이면 캡션 자리에 편집 중 애니메이션을 보이고 누르면 안내
 * 사진이나 캡션을 누르면 캡션 화면으로 가며, 순서·추가·빼기와 캡션 입력은 그 화면의 일이라 이 화면에서는 보기만 함
 */
export function DraftPhotos({ draft, onEditingBlocked, onOpenPhoto }: DraftPhotosProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = draft.photos.length;
  const current = Math.min(activeIndex, Math.max(0, total - 1));
  const active = draft.photos[current];
  const editors = (draft.editing.photoMemberIds ?? []).flatMap((id) => {
    const member = draft.members.find((candidate) => candidate.id === id);
    return member ? [{ name: member.name, src: member.avatarSrc }] : [];
  });

  return (
    <section aria-labelledby="draft-photos-title" className="pt-s15 gap-s3 flex flex-col">
      <BundleTitle
        title={BUNDLE_MESSAGES.photosTitle}
        titleId="draft-photos-title"
        icon={false}
        members={editors}
        membersLabel="편집 중인 멤버"
        className="px-padding-p8"
      />
      <ul
        className="gap-s6 px-padding-p8 scroll-px-padding-p8 flex snap-x snap-mandatory scrollbar-none overflow-x-auto [&::-webkit-scrollbar]:hidden"
        onScroll={(event) =>
          setActiveIndex(Math.max(0, Math.round(event.currentTarget.scrollLeft / PHOTO_STEP)))
        }
      >
        {draft.photos.map((photo) => (
          <li key={photo.id} className="relative snap-start">
            <BundlePhoto src={photo.src} alt={photo.alt} size="s" />
            {onOpenPhoto && (
              <button
                type="button"
                aria-label={BUNDLE_MESSAGES.photoOpenLabel(draft.photos.indexOf(photo) + 1)}
                onClick={() => onOpenPhoto(photo.id)}
                className="rounded-r4 focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2"
              />
            )}
          </li>
        ))}
      </ul>
      {active && (
        <>
          {/* Figma placeholder: 높이 46px 고정(위아래 2px, 세로 가운데), 편집 중에도 같은 자리를 씀 */}
          {editors.length > 0 ? (
            <button
              type="button"
              aria-label={BUNDLE_MESSAGES.editingLabel(
                editors.map((editor) => editor.name).join(', '),
              )}
              onClick={onEditingBlocked}
              className="px-padding-p8 py-padding-p1 flex h-11.5 w-full cursor-pointer touch-manipulation items-center text-left"
            >
              <EditingLottie />
            </button>
          ) : (
            <CaptionRow onOpen={onOpenPhoto && active ? () => onOpenPhoto(active.id) : undefined}>
              <p
                className={cn(
                  'typography-body-3-regular line-clamp-2 min-w-0 flex-1 wrap-break-word',
                  active.caption === '' ? 'text-text-quaternary' : 'text-text-primary',
                )}
              >
                {active.caption === '' ? BUNDLE_MESSAGES.captionPlaceholder : active.caption}
              </p>
            </CaptionRow>
          )}
          <p role="status" className="sr-only">
            {`${total}장 중 ${current + 1}번째 사진`}
          </p>
        </>
      )}
    </section>
  );
}
