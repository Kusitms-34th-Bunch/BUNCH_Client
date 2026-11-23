'use client';

import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { BundlePickPhoto } from '@app/design-system/web';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { DraftMember, DraftPhoto } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { chunk, hasPicked, pickersOf, type Picks } from '../../lib/picks';
import { PickGlint, PickMiniGlint } from './PickGlint';
import styles from './pickMotion.module.css';

// 사진 폭 295 + 간격 10: 가로로 넘긴 거리를 사진 번호로 바꾸는 기준(Figma `5699:103586`)
const PHOTO_STEP = 295 + 10;
// 한 줄에 보이는 픽한 멤버 수(Figma `5699:103593`)
const PICKERS_PER_ROW = 4;
// 픽하기 모션 길이(ms, Figma 5699:103708의 3.4초)
const PICK_MOTION_MS = 3400;
type DraftPickScreenProps = {
  photos: readonly DraftPhoto[];
  members: readonly DraftMember[];
  /** 지금 보는 사람(내가 픽한 멤버 칩만 강조) */
  viewerId: string;
  picks: Picks;
  /** 참여 멤버만 픽할 수 있음 */
  editable: boolean;
  onToggle: (_photoId: string) => void;
  /** 참여 멤버가 아니라 픽할 수 없을 때 */
  onDenied: () => void;
  onBack: () => void;
  /** 들어온 뒤 번들에서 빠졌지만 아직 보이고 있는 사진(누르면 「삭제된 사진이에요」 안내, 기능 spec 4.3.5 예외) */
  removedIds?: ReadonlySet<string> | undefined;
  /** 서버가 그 사진이 없다고 알려 준 경우: 누른 직후 바로 「삭제된 사진이에요」 안내를 띄울 사진 */
  deletedNoticeFor?: string | undefined;
  /** 안내의 「확인」 뒤에 그 사진을 목록에서 없앰 */
  onDismissRemoved?: ((_photoId: string) => void) | undefined;
};

/**
 * 대표 사진 투표 화면(Figma `5699:103571`~`103708`): 「마음에 드는 사진을 픽해보세요」 아래 가로로 넘기는 사진 한 장씩, 「이 사진 픽하기」, 픽한 멤버 칩
 * 가운데 사진만 또렷하고 옆 사진은 흐리며, 픽하면 버튼이 「사진을 픽했어요」로 바뀌고 다시 누르면 해제
 * 보고 있던 사진이 지워져도 바로 없애지 않고 그대로 보이다가, 「이 사진 픽하기」를 누르면 픽하지 않고 「삭제된 사진이에요」 안내 창,
 * 「확인」 뒤에 그 사진을 없애고 다음 사진(마지막이었으면 이전 사진)을 보임
 */
export function DraftPickScreen({
  photos,
  members,
  viewerId,
  picks,
  editable,
  onToggle,
  onDenied,
  onBack,
  removedIds,
  deletedNoticeFor,
  onDismissRemoved,
}: DraftPickScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const openOverlay = useScreenOverlay();
  const reducedMotion = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  // 픽하기 모션: 어느 사진에서 시작했는지와 픽하기 전 픽한 수(3.4초 뒤 사라짐)
  const [fx, setFx] = useState<{ photoId: string; prevCount: number } | null>(null);
  const fxTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(fxTimer.current), []);
  const total = photos.length;
  const current = Math.min(activeIndex, Math.max(0, total - 1));
  const active = photos[current];

  // 창이 떠 있는 사이 또 눌러도 안내 창을 겹치지 않음
  const deletedNoticeOpen = useRef(false);
  const openDeletedNotice = (photoId: string) => {
    if (deletedNoticeOpen.current) return;
    deletedNoticeOpen.current = true;
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          appearance="text"
          title={BUNDLE_MESSAGES.pickDeletedTitle}
          description={BUNDLE_MESSAGES.pickDeletedDescription}
          confirmLabel={BUNDLE_MESSAGES.missingDraftConfirm}
          onConfirm={() => {
            close();
            onDismissRemoved?.(photoId);
          }}
        />
      ),
      () => {
        deletedNoticeOpen.current = false;
      },
    );
  };

  const pickers = (active ? pickersOf(picks, active.id) : []).filter((id) =>
    members.some((member) => member.id === id),
  );
  const picked = active ? hasPicked(picks, active.id, viewerId) : false;
  // 내가 맨 앞, 나머지는 픽한 순서
  const ordered = [...pickers].sort((a, b) => Number(b === viewerId) - Number(a === viewerId));
  // 사진 목록에 포커스가 있을 때 좌우 방향키로 한 장씩 넘김(스크롤만으로는 키보드로 다른 사진을 고를 수 없음)
  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (direction === 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    listRef.current?.scrollBy({
      left: direction * PHOTO_STEP,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };
  // 서버 응답으로 사진이 없다고 확인되면 곧바로 안내(최신 openDeletedNotice를 ref로 거쳐 `deletedNoticeFor`가 바뀔 때만 실행)
  const openNoticeRef = useRef(openDeletedNotice);
  useEffect(() => {
    openNoticeRef.current = openDeletedNotice;
  });
  useEffect(() => {
    if (deletedNoticeFor !== undefined) openNoticeRef.current(deletedNoticeFor);
  }, [deletedNoticeFor]);

  const handlePick = () => {
    if (!active) return;
    // 번들에서 빠진 사진은 픽하지 않고 안내만
    if (removedIds?.has(active.id)) {
      openDeletedNotice(active.id);
      return;
    }
    if (!editable) {
      onDenied();
      return;
    }
    // 픽할 때만 모션(해제에는 없음), 동작 줄이기면 생략
    if (!picked && !reducedMotion) {
      setFx({ photoId: active.id, prevCount: ordered.length });
      clearTimeout(fxTimer.current);
      fxTimer.current = setTimeout(() => setFx(null), PICK_MOTION_MS);
    } else {
      clearTimeout(fxTimer.current);
      setFx(null);
    }
    onToggle(active.id);
  };
  const fxOn = fx !== null && active?.id === fx.photoId && picked;
  const nameOf = (memberId: string) => members.find((member) => member.id === memberId)?.name ?? '';

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
      <div className="pt-padding-p15 gap-s2 flex flex-col items-center text-center">
        <p className="typography-body-4-semi-bold text-text-quaternary px-padding-p8 w-full">
          {BUNDLE_MESSAGES.pickNotice}
        </p>
        <h1 className="typography-title-1-semi-bold text-text-secondary px-padding-p8 w-full">
          {BUNDLE_MESSAGES.pickTitle}
        </h1>
      </div>
      {/* 사진 목록은 포커스를 받아 좌우 방향키로 한 장씩 넘기는 스크롤 영역이라 비대화형 요소 규칙의 예외(자식에 포커스 가능한 요소가 없어 Safari는 키보드로 스크롤할 수 없음) */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <ul
        ref={listRef}
        // 포커스를 받아 좌우 방향키로 사진을 넘김(Safari는 포커스 가능한 자식이 없는 스크롤 영역에 포커스를 주지 않음)
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        aria-label={BUNDLE_MESSAGES.pickPhotos}
        aria-roledescription={BUNDLE_MESSAGES.pickCarousel}
        onKeyDown={handleListKeyDown}
        className="gap-s5 pt-s8 focus-visible:outline-border-brand flex snap-x snap-mandatory scrollbar-none overflow-x-auto px-[calc(50%-147.5px)] [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const next = Math.max(0, Math.round(event.currentTarget.scrollLeft / PHOTO_STEP));
          // 다른 사진으로 넘기면 모션을 끝냄(돌아왔을 때 처음부터 다시 재생되지 않게)
          if (next !== activeIndex) setFx(null);
          setActiveIndex(next);
        }}
      >
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className={`relative shrink-0 snap-center ${fxOn && index === current ? styles.fx : ''}`}
          >
            {/* 가운데가 아닌 사진은 흐림(opacity-disabled) */}
            <BundlePickPhoto
              src={photo.src}
              alt={photo.alt}
              className={
                index !== current
                  ? 'opacity-(--semantic-opacity-disabled)'
                  : fxOn
                    ? styles.photo
                    : undefined
              }
            />
            {fxOn && index === current ? <PickGlint /> : null}
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">
        {active ? BUNDLE_MESSAGES.photoPosition(current + 1, total) : ''}
      </p>
      {active ? (
        <div className={`pt-s5 px-padding-p8 flex flex-col items-center ${fxOn ? styles.fx : ''}`}>
          <Button
            variant={picked ? 'brand' : 'brandSubtle'}
            size="md"
            className={fxOn ? `w-73.75 ${styles.button}` : 'w-73.75'}
            onClick={handlePick}
          >
            {picked ? BUNDLE_MESSAGES.pickedButton : BUNDLE_MESSAGES.pickButton}
          </Button>
        </div>
      ) : null}
      {ordered.length > 0 ? (
        <div
          className={`pt-s14 px-padding-p18 gap-s6 flex flex-col items-center ${fxOn ? styles.fx : ''}`}
        >
          <div className="relative">
            <p
              className={`typography-body-4-regular text-text-quaternary text-center ${fxOn ? styles.countNew : ''}`}
            >
              {BUNDLE_MESSAGES.pickedCount(ordered.length)}
            </p>
            {/* 모션 중 사라지는 이전 픽한 수(화면 낭독은 새 수만 읽음) */}
            {fxOn && fx.prevCount > 0 ? (
              <p
                aria-hidden="true"
                className={`typography-body-4-regular text-text-quaternary text-center ${styles.countOld}`}
              >
                {BUNDLE_MESSAGES.pickedCount(fx.prevCount)}
              </p>
            ) : null}
          </div>
          {chunk(ordered, PICKERS_PER_ROW).map((row, rowIndex) => (
            <ul key={row.join('-')} className="gap-s3 flex flex-wrap items-center justify-center">
              {row.map((memberId) => (
                <li
                  key={memberId}
                  className={`${
                    memberId === viewerId
                      ? 'bg-surface-brand-subtle-1 text-text-brand px-padding-p4 py-padding-p2 rounded-r4 typography-body-3-regular relative'
                      : 'bg-surface-secondary text-text-tertiary px-padding-p4 py-padding-p2 rounded-r4 typography-body-3-regular'
                  } ${fxOn ? (memberId === viewerId ? styles.badgeMe : rowIndex === 0 ? styles.badgeOther : '') : ''}`}
                >
                  {fxOn && memberId === viewerId ? <PickMiniGlint /> : null}
                  {nameOf(memberId)}
                  {memberId === viewerId ? (
                    <span className="sr-only">{BUNDLE_MESSAGES.pickedByMe}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}
