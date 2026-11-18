'use client';

import {
  Button,
  ConfirmDialog,
  Header,
  LineChevronLeftLargeIcon,
  LineCopyMediumIcon,
  LineTrashcanMediumIcon,
} from '@app/design-system';
import { LocationCard, MoreMenuSheet } from '@app/design-system/web';
import { useEffect, useRef } from 'react';
import { useIntersectionObserver } from 'react-simplikit';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useHoldScrollOnLeave } from '@/shared/hooks/useHoldScrollOnLeave';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { useScrollInHistory } from '@/shared/hooks/useScrollInHistory';
import type { KokPlace, PlaceMember } from '../lib/types';
import { PLACES_MESSAGES } from '../constants/messages';
import { PlaceMemberFilter } from './PlaceMemberFilter';

type BunchPlacesScreenProps = {
  members: readonly PlaceMember[];
  /** 멤버 id와 `ALL_MEMBERS`별 콕한 장소 수 */
  counts: Readonly<Record<string, number>>;
  /** 고른 칩 id. 「전체」는 `ALL_MEMBERS` */
  selectedId: string;
  onSelect: (_memberId: string) => void;
  /** 고른 칩의 장소(최근에 콕한 순). 받는 중이면 없음 */
  places: readonly KokPlace[] | undefined;
  /** 되돌리기로 다시 생긴 장소(되돌릴 때마다 순번이 늘어남). 그 카드가 보이면 초점을 옮김 */
  restored?: { id: string; seq: number } | undefined;
  /** 칩을 바꿔 새 목록을 받는 중(보던 목록은 유지) */
  busy?: boolean | undefined;
  /** 목록을 받지 못함. 있으면 오류 안내와 「다시 시도」를 보임 */
  onRetry?: (() => void) | undefined;
  onBack: () => void;
  /** 「주소 복사하기」를 누른 순간 바로 호출(클립보드 쓰기는 사용자 제스처 안이어야 함). 복사했는지를 돌려줌 */
  onCopyAddress: (_place: KokPlace) => Promise<boolean>;
  /** 복사 결과 알림(시트가 닫힌 뒤 호출) */
  onCopyDone: (_copied: boolean) => void;
  /** 「콕에서 빼기」(시트·모달이 닫힌 뒤 호출) */
  onRemove: (_place: KokPlace) => void;
  /**
   * 번들에서 담아 온 장소 카드를 누름. 없으면 카드는 눌리지 않음
   * 누른 순간 그 번들을 볼 수 없게 됐으면 `unavailable`을 돌려주고 화면이 볼 수 없는 번들 모달을 띄움(기능명세서 8.1.5 상세 3)
   */
  onOpenBundle?: ((_place: KokPlace) => Promise<'unavailable' | undefined>) | undefined;
  /** 이어 받을 쪽이 남음(기능명세서 8.1.3 상세 5) */
  hasMore?: boolean | undefined;
  /** 받은 쪽 수. 쪽을 더 받으면 맨 아래 감지 요소를 새로 붙여, 아직 보이면 바로 다음 쪽을 받게 함 */
  pageCount?: number | undefined;
  /** 목록 끝이 보이면 호출. 받는 중이면 무시함 */
  onLoadMore?: (() => void) | undefined;
  onBrowseFeed: () => void;
};

/**
 * 콕한 장소(기능명세 8.1.1~8.1.9, 화면설계서 4164:91159): 멤버별 필터 칩 + 장소 카드 목록
 * 더보기 시트(주소 복사하기·콕에서 빼기), 볼 수 없는 번들 모달, 빈 상태. 헤더와 칩은 고정하고 목록만 스크롤
 */
export function BunchPlacesScreen({
  members,
  counts,
  selectedId,
  onSelect,
  places,
  restored,
  busy = false,
  onRetry,
  onBack,
  onCopyAddress,
  onCopyDone,
  onRemove,
  onOpenBundle,
  hasMore = false,
  pageCount = 1,
  onLoadMore,
  onBrowseFeed,
}: BunchPlacesScreenProps) {
  const openOverlay = useScreenOverlay();
  // 번들 상세에서 돌아오면 보던 자리로(기능명세서 8.1.5 상세 2). 받은 쪽은 캐시에 남아 같은 높이로 다시 그려짐
  const titleRef = useRef<HTMLHeadingElement>(null);
  useScrollInHistory(titleRef, places !== undefined);
  useHoldScrollOnLeave(titleRef, places !== undefined);
  // 실패해도 감지 요소는 그대로 두어(같은 key) 다시 스크롤해 보일 때 재시도, 성공해 쪽이 늘면 key가 바뀌어 새로 붙음
  const observeMore = useIntersectionObserver<HTMLSpanElement>((entry) => {
    if (entry.isIntersecting) onLoadMore?.();
  }, {});
  // 뺀 카드가 사라지면 초점이 body로 떨어지므로 같은 자리에 온 다음 카드(없으면 빈 상태 제목)로 옮김
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLHeadingElement>(null);
  const focusIndex = useRef<number | null>(null);
  // 초점을 옮긴 되돌리기 순번(같은 되돌리기로 다시 옮기지 않게)
  const focusedRestore = useRef(0);
  const visible = places ?? [];

  useEffect(() => {
    if (!places) return;
    const index = focusIndex.current;
    if (index !== null) {
      focusIndex.current = null;
      const buttons = listRef.current?.querySelectorAll<HTMLElement>(
        'button[aria-label$="더보기"]',
      );
      if (buttons && buttons.length > 0) buttons[Math.min(index, buttons.length - 1)]?.focus();
      else emptyRef.current?.focus();
      return;
    }
    // 되돌리기로 다시 생긴 카드로 초점을 옮김(토스트가 사라져도 읽던 자리를 잃지 않게)
    if (!restored || focusedRestore.current === restored.seq) return;
    if (!places.some((place) => place.id === restored.id)) return;
    focusedRestore.current = restored.seq;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-place-id="${restored.id}"] button[aria-label$="더보기"]`)
      ?.focus();
  }, [places, restored]);

  const removePlace = (place: KokPlace) => {
    focusIndex.current = Math.max(
      0,
      visible.findIndex((item) => item.id === place.id),
    );
    onRemove(place);
  };

  // 더보기 시트(화면설계서 3-1·5·6): 주소 복사하기 / 콕에서 빼기 / 취소
  // 항목을 누르면 닫고, 동작은 닫힌 뒤 실행(토스트가 열린 창 뒤에 가려지거나 낭독이 묻히지 않게)
  const openMenu = (place: KokPlace) => {
    let afterClose: (() => void) | undefined;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          title={`${place.name} ${PLACES_MESSAGES.menuTitle}`}
          cancelLabel={PLACES_MESSAGES.cancel}
          items={[
            {
              id: 'copy',
              label: PLACES_MESSAGES.copyAddress,
              leftIcon: <LineCopyMediumIcon aria-hidden />,
              onSelect: () => {
                // 클립보드 쓰기는 누른 순간(사용자 제스처 안)에 하고, 결과 알림만 시트가 닫힌 뒤로 미룸
                const copied = onCopyAddress(place);
                afterClose = () => void copied.then(onCopyDone);
                close();
              },
            },
            {
              id: 'remove',
              label: PLACES_MESSAGES.removeFromPlaces,
              leftIcon: <LineTrashcanMediumIcon aria-hidden />,
              onSelect: () => {
                afterClose = () => removePlace(place);
                close();
              },
            },
          ]}
        />
      ),
      () => afterClose?.(),
    );
  };

  // 볼 수 없는 번들 모달(화면설계서 4번, Figma 4164:96354): 취소 왼쪽·콕에서 빼기 오른쪽
  const openUnavailable = (place: KokPlace) => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={PLACES_MESSAGES.unavailableTitle}
          description={PLACES_MESSAGES.unavailableDescription}
          appearance="solid"
          cancelLabel={PLACES_MESSAGES.cancel}
          confirmLabel={PLACES_MESSAGES.removeFromPlaces}
          onConfirm={() => {
            confirmed = true;
            close();
          }}
        />
      ),
      () => {
        if (confirmed) removePlace(place);
      },
    );
  };

  const sourceProps = (place: KokPlace) => {
    if (place.source.kind === 'bundle') {
      return { source: place.source.bunchName, bundleTitle: place.source.bundleTitle };
    }
    return {
      source:
        place.source.kind === 'pick'
          ? PLACES_MESSAGES.pickSource
          : PLACES_MESSAGES.unavailableSource,
    };
  };

  const clickHandler = (place: KokPlace) => {
    if (place.source.kind === 'unavailable') {
      return () => openUnavailable(place);
    }
    if (place.source.kind === 'bundle' && onOpenBundle) {
      return () =>
        void onOpenBundle(place).then((result) => {
          if (result === 'unavailable') openUnavailable(place);
        });
    }
    // 광고에서 콕한 장소는 담아 온 번들이 없어 눌러도 이동하지 않음(기능명세 8.1.3 상세 동작 4)
    return undefined;
  };

  return (
    <PageShell
      header={
        <>
          <Header
            leading={
              <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
                <LineChevronLeftLargeIcon />
              </HeaderIconButton>
            }
          />
          {/* 받기 전에는 개수를 몰라 칩을 그리지 않음(「전체 0」으로 보이지 않게) */}
          {places ? (
            <PlaceMemberFilter
              members={members}
              selectedId={selectedId}
              counts={counts}
              onSelect={onSelect}
            />
          ) : null}
        </>
      }
    >
      <h1 ref={titleRef} className="sr-only">
        {PLACES_MESSAGES.pageTitle}
      </h1>
      {onRetry ? (
        <div className="gap-s8 px-padding-p8 pb-s23 flex min-h-full flex-col items-center justify-center">
          <p role="alert" className="typography-body-3-semibold text-text-secondary text-center">
            {PLACES_MESSAGES.error}
          </p>
          <Button variant="tertiary" size="md" onClick={onRetry}>
            {PLACES_MESSAGES.retry}
          </Button>
        </div>
      ) : !places ? null : visible.length > 0 ? (
        // Figma 4096:76101: 칩 아래 24(칩 영역 아래 여백 4 포함), 카드 사이 4, 좌우 16
        <>
          <ul
            ref={listRef}
            aria-busy={busy}
            className="gap-s2 px-padding-p8 pb-s8 flex flex-col pt-6"
          >
            {visible.map((place) => (
              <li key={place.id} data-place-id={place.id}>
                <LocationCard
                  placeName={place.name}
                  address={place.address ?? ''}
                  {...sourceProps(place)}
                  onClick={clickHandler(place)}
                  onMore={() => openMenu(place)}
                />
              </li>
            ))}
          </ul>
          {hasMore ? (
            <span key={pageCount} ref={observeMore} aria-hidden="true" className="block h-px" />
          ) : null}
        </>
      ) : (
        // Figma 4096:76353: 제목 16 medium, 설명 13 두 줄, 제목과 설명 4, 문구와 버튼 16, 버튼 40
        <div className="px-padding-p8 pb-s23 flex min-h-full items-center justify-center">
          <div className="gap-s8 flex flex-col items-center">
            <div className="gap-s2 flex flex-col items-center text-center">
              <h2
                ref={emptyRef}
                tabIndex={-1}
                className="typography-body-1-medium text-text-secondary focus:outline-none"
              >
                {PLACES_MESSAGES.emptyTitle}
              </h2>
              <p className="typography-body-4-regular text-text-tertiary break-keep whitespace-pre-line">
                {PLACES_MESSAGES.emptyDescription}
              </p>
            </div>
            <Button size="md" className="w-full" onClick={onBrowseFeed}>
              {PLACES_MESSAGES.browseFeed}
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}
