'use client';

import { Button, cn, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { BundlePickPhoto, ColorBadge } from '@app/design-system/web';
import { useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import type { DraftActions } from '../../hooks/useDraft';
import type { Draft, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { getDraftAccess } from '../../lib/permissions';
import styles from './draftPick.module.css';

// 카드 295px과 사진 사이 간격 10px: 가로로 넘긴 거리를 사진 번호로 바꾸는 기준
const PHOTO_STEP = 295 + 10;
// 한 줄(칩 4개)을 넘으면 줄바꿈되어 옆으로 밀리는 모션을 쓰지 않음
const CHIPS_PER_ROW = 4;

type DraftPickProps = {
  draft: Draft;
  viewer: DraftViewer;
  actions: Pick<DraftActions, 'togglePick'>;
  onBack: () => void;
};

/**
 * 픽하기(Figma `5699:103571`·`5699:103643`): 사진을 넘기며 마음에 드는 사진을 픽하고 누가 픽했는지 칩으로 봄
 * 참여 멤버만 픽할 수 있고, 내 칩은 맨 앞에 브랜드색으로 보임
 */
export function DraftPick({ draft, viewer, actions, onBack }: DraftPickProps) {
  const [index, setIndex] = useState(0);
  // 방금 픽한 사진(모션 재생 중). 칩 등장이 끝나거나 사진을 넘기면 풀림
  const [playing, setPlaying] = useState<string | undefined>(undefined);
  const access = getDraftAccess(draft, viewer);
  const total = draft.photos.length;
  const current = Math.min(index, Math.max(0, total - 1));
  const active = draft.photos[current];
  const pickedBy = active?.pickedBy ?? [];
  const picked = pickedBy.includes(viewer.memberId);
  const pickers = [...pickedBy]
    .sort((a, b) => Number(b === viewer.memberId) - Number(a === viewer.memberId))
    .flatMap((id) => {
      const member = draft.members.find((candidate) => candidate.id === id);
      return member ? [member] : [];
    });
  const animating = active !== undefined && playing === active.id;

  const toggle = () => {
    if (!active) return;
    if (!access.canEdit) {
      toast(BUNDLE_MESSAGES.editOnlyParticipants, { fullWidth: true });
      return;
    }
    setPlaying(picked ? undefined : active.id);
    actions.togglePick(active.id);
  };

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="뒤로 가기" onClick={onBack}>
              <LineChevronLeftLargeIcon aria-hidden="true" />
            </HeaderIconButton>
          }
        />
      }
    >
      <div className="gap-s2 pt-padding-p15 flex flex-col items-center text-center">
        <p className="typography-body-4-semi-bold text-text-quaternary">
          {BUNDLE_MESSAGES.pickHint}
        </p>
        <h1 className="typography-title-1-semi-bold text-text-secondary">
          {BUNDLE_MESSAGES.pickTitle}
        </h1>
      </div>
      {/* 키보드로 옆 사진을 볼 수 있게 스크롤 영역이 초점을 받음(BundlePhoto 상세와 같은 방식) */}
      <div
        role="group"
        aria-label={BUNDLE_MESSAGES.pickPhotosLabel}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- 스크롤 영역은 초점을 받아야 방향키로 넘길 수 있음
        tabIndex={0}
        className="pt-s8 gap-s5 focus-visible:outline-border-brand flex snap-x snap-mandatory scroll-px-10 scrollbar-none overflow-x-auto px-10 focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const next = Math.max(0, Math.round(event.currentTarget.scrollLeft / PHOTO_STEP));
          if (next !== current) {
            setIndex(next);
            setPlaying(undefined);
          }
        }}
      >
        {draft.photos.map((photo) => (
          <div
            key={photo.id}
            className={cn(
              'relative shrink-0 snap-start',
              playing === photo.id && styles.photoPulse,
            )}
          >
            <BundlePickPhoto src={photo.src} alt={photo.alt} />
            {playing === photo.id && (
              <span
                aria-hidden="true"
                className={cn(
                  'bg-overlay-dim-subtle rounded-r3 absolute inset-0 opacity-0',
                  styles.photoDim,
                )}
              />
            )}
          </div>
        ))}
      </div>
      <p role="status" className="sr-only">
        {active ? BUNDLE_MESSAGES.pickPosition(current + 1, total) : ''}
        {picked ? `, ${BUNDLE_MESSAGES.pickDone}` : ''}
      </p>
      {active && (
        <div className="pt-s5 px-10">
          <Button
            size="md"
            variant={picked ? 'brand' : 'brandSubtle'}
            onClick={toggle}
            className={cn('w-73.75', animating && styles.buttonPress)}
          >
            {picked ? BUNDLE_MESSAGES.pickDone : BUNDLE_MESSAGES.pickAction}
          </Button>
        </div>
      )}
      {pickers.length > 0 && (
        <div className="pt-s14 pb-padding-p6 gap-s6 flex flex-col items-center px-10">
          <p
            key={pickers.length}
            className={cn(
              'typography-body-4-regular text-text-quaternary',
              animating && styles.countIn,
            )}
          >
            {BUNDLE_MESSAGES.pickCount(pickers.length)}
          </p>
          <ul className="gap-x-s3 gap-y-s6 flex max-w-45.5 flex-wrap justify-center">
            {pickers.map((member) => {
              const mine = member.id === viewer.memberId;
              return (
                <li
                  key={member.id}
                  onAnimationEnd={mine && animating ? () => setPlaying(undefined) : undefined}
                  className={cn(
                    animating && mine && styles.chipPop,
                    animating && !mine && pickers.length <= CHIPS_PER_ROW && styles.chipShift,
                  )}
                >
                  <ColorBadge size="lg" color={mine ? 'brand' : 'gray'}>
                    {member.name}
                  </ColorBadge>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PageShell>
  );
}
