'use client';

import { cn } from '@app/design-system';
import { BundlePhoto, BundleTitle } from '@app/design-system/web';
import { useState } from 'react';
import { EditingLottie } from '@/shared/components/loading/EditingLottie';
import type { Draft } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';

// BundlePhoto `s`(300px)와 사진 사이 간격 12px: 가로로 넘긴 거리를 사진 번호로 바꾸는 기준
const PHOTO_STEP = 300 + 12;

type DraftPhotosProps = {
  draft: Draft;
  /** 다른 멤버가 사진·캡션을 편집 중일 때 캡션 줄을 눌렀을 때 */
  onEditingBlocked: () => void;
};

/**
 * 사진 가로 목록(옆 사진이 일부 보임)과 가운데 사진의 캡션(높이 46px 고정, 2줄까지, 넘치면 「…」, 없으면 「캡션 추가...」)
 * 다른 멤버가 편집 중이면 캡션 자리에 편집 중 애니메이션을 보이고 누르면 안내
 * 순서·추가·빼기와 캡션 입력은 캡션 화면의 일이라 이 화면에서는 보기만 함
 */
export function DraftPhotos({ draft, onEditingBlocked }: DraftPhotosProps) {
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
          <li key={photo.id} className="snap-start">
            <BundlePhoto src={photo.src} alt={photo.alt} size="s" />
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
            <div className="px-padding-p8 py-padding-p1 flex h-11.5 items-center overflow-hidden">
              <p
                className={cn(
                  'typography-body-3-regular line-clamp-2 min-w-0 flex-1 wrap-break-word',
                  active.caption === '' ? 'text-text-quaternary' : 'text-text-primary',
                )}
              >
                {active.caption === '' ? BUNDLE_MESSAGES.captionPlaceholder : active.caption}
              </p>
            </div>
          )}
          <p role="status" className="sr-only">
            {`${total}장 중 ${current + 1}번째 사진`}
          </p>
        </>
      )}
    </section>
  );
}
