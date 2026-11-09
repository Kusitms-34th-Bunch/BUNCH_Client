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
import { useEffect, useRef, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { PLACES_MESSAGES } from '../constants/messages';
import { countByMember, filterByMember } from '../lib/places';
import { ALL_MEMBERS, type KokPlace, type PlaceMember } from '../lib/types';
import { PlaceMemberFilter } from './PlaceMemberFilter';

type BunchPlacesScreenProps = {
  members: readonly PlaceMember[];
  /** 최근에 콕한 순으로 정렬된 목록 */
  places: readonly KokPlace[];
  onBack: () => void;
  /** 「주소 복사하기」를 누른 순간 바로 호출(클립보드 쓰기는 사용자 제스처 안이어야 함). 복사했는지를 돌려줌 */
  onCopyAddress: (_place: KokPlace) => Promise<boolean>;
  /** 복사 결과 알림(시트가 닫힌 뒤 호출) */
  onCopyDone: (_copied: boolean) => void;
  /** 「콕에서 빼기」(시트·모달이 닫힌 뒤 호출) */
  onRemove: (_place: KokPlace) => void;
  /** 번들에서 담아 온 장소 카드를 누름. 없으면 카드는 눌리지 않음(번들 상세가 생기면 연결) */
  onOpenBundle?: ((_place: KokPlace) => void) | undefined;
  onBrowseFeed: () => void;
};

/**
 * 콕한 장소(기능명세 8.1.1~8.1.9, 화면설계서 4164:91159): 멤버별 필터 칩 + 장소 카드 목록
 * 더보기 시트(주소 복사하기·콕에서 빼기), 볼 수 없는 번들 모달, 빈 상태. 헤더와 칩은 고정하고 목록만 스크롤
 */
export function BunchPlacesScreen({
  members,
  places,
  onBack,
  onCopyAddress,
  onCopyDone,
  onRemove,
  onOpenBundle,
  onBrowseFeed,
}: BunchPlacesScreenProps) {
  const [selectedId, setSelectedId] = useState(ALL_MEMBERS);
  const openOverlay = useScreenOverlay();
  // 뺀 카드가 사라지면 초점이 body로 떨어지므로 같은 자리에 온 다음 카드(없으면 빈 상태 제목)로 옮김
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLHeadingElement>(null);
  const focusIndex = useRef<number | null>(null);
  // 되돌려 다시 생긴 카드를 알아보기 위해 직전 목록의 장소 id를 기억
  const previousIds = useRef(new Set(places.map((place) => place.id)));

  const counts = countByMember(places);
  const visible = filterByMember(places, selectedId);

  useEffect(() => {
    const previous = previousIds.current;
    previousIds.current = new Set(places.map((place) => place.id));
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
    const restored = places.find((place) => !previous.has(place.id));
    if (restored) {
      listRef.current
        ?.querySelector<HTMLElement>(
          `[data-place-id="${restored.id}"] button[aria-label$="더보기"]`,
        )
        ?.focus();
    }
  }, [places]);

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
    if (place.source.kind === 'bundle' && onOpenBundle) return () => onOpenBundle(place);
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
          <PlaceMemberFilter
            members={members}
            selectedId={selectedId}
            counts={counts}
            onSelect={setSelectedId}
          />
        </>
      }
    >
      <h1 className="sr-only">{PLACES_MESSAGES.pageTitle}</h1>
      {visible.length > 0 ? (
        // Figma 4096:76101: 칩 아래 24(칩 영역 아래 여백 4 포함), 카드 사이 4, 좌우 16
        <ul ref={listRef} className="gap-s2 px-padding-p8 pb-s8 flex flex-col pt-6">
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
