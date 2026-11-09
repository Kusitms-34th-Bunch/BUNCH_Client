'use client';

import { ConfirmDialog } from '@app/design-system';
import { BundleMembersSheet, PlacePickSheet } from '@app/design-system/web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { useScreenOverlay, type ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';
import type { FeedBundleMember, FeedPlace } from '../lib/types';
import { FEED_MESSAGES as text } from '../constants/messages';
import { FEED_PATHS } from '../constants/paths';
import { DELETED_USER_IMAGE } from '../lib/deletedUserImage';
import { subjectParticle } from '../lib/josa';
import { useFeedViewer } from './useFeedViewer';

type PickStates = Record<string, boolean>;

type PlacePickOverlayProps = ScreenOverlayProps & {
  places: FeedPlace[];
  initialPicks: PickStates;
  /** 콕했을 때(다시 열어도 유지) */
  onPicked: (_placeId: string) => void;
  /** 소속 번치가 없으면 담긴 표시 없음 */
  hasBunch: boolean;
  /** 소속 번치가 있을 때만 실행하고, 없으면 안내 */
  asBunch: (_action: () => void) => void;
  /** 담긴 장소를 눌렀을 때 */
  onCancelPick: (_place: FeedPlace) => void;
};

/** 콕하면 열린 시트의 버튼이 바로 바뀌게 함(overlay는 열 때의 값으로 그려짐) */
function PlacePickOverlay({
  places,
  initialPicks,
  onPicked,
  hasBunch,
  asBunch,
  onCancelPick,
  ...rootProps
}: PlacePickOverlayProps) {
  const [picked, setPicked] = useState(initialPicks);
  const isPicked = (place: FeedPlace) => (hasBunch ? (picked[place.id] ?? place.picked) : false);
  return (
    <PlacePickSheet
      {...rootProps}
      places={places.map((place) => ({
        id: place.id,
        name: place.name,
        address: place.address,
        picked: isPicked(place),
      }))}
      onPick={(placeId) =>
        asBunch(() => {
          const place = places.find(({ id }) => id === placeId);
          if (!place) return;
          if (isPicked(place)) return onCancelPick(place);
          onPicked(place.id);
          setPicked((current) => ({ ...current, [place.id]: true }));
        })
      }
    />
  );
}

/**
 * 번들 카드·상세 위 시트(기능명세서 6.3.1·6.3.2, Figma `5367:112139`·`5367:112596`): 장소 콕하기와 콕 취소 확인, 참여 멤버
 * API 연결 전이라 콕은 화면에서만 바뀜(구현 단위 10). 멤버를 누르면 시트가 닫힌 뒤 멤버 프로필로 이동
 */
export function useBundleSheets() {
  const router = useRouter();
  const openOverlay = useScreenOverlay();
  // 시트가 하단을 덮으므로 토스트는 위에
  const { viewer, asBunch } = useFeedViewer({ position: 'top' });
  // 화면에 있는 동안 시트를 다시 열어도 콕한 상태를 유지
  const picks = useRef<PickStates>({});

  // 콕 취소 확인 창(화면설계서 피드 2번): 무엇을 고르든 창이 다 닫힌 뒤 콕하기 시트를 다시 올려 이어서 고르게 함
  const openPickCancel = (place: FeedPlace, places: FeedPlace[]) =>
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={text.pickCancelTitle}
          description={text.pickCancelDescription(place.name, subjectParticle(place.name))}
          cancelLabel={text.pickCancelNo}
          confirmLabel={text.pickCancelConfirm}
          onConfirm={() => {
            picks.current = { ...picks.current, [place.id]: false };
            close();
          }}
        />
      ),
      () => openPlaces(places),
    );

  // 확인 창이 닫힌 뒤 다시 열 때도 그 시점의 소속 번치로 그리도록 열 때마다 최신 값을 읽음
  const hasBunch = usePreservedCallback(() => viewer !== null);
  const asLatestBunch = usePreservedCallback(asBunch);

  function openPlaces(places: FeedPlace[]) {
    let cancelTarget: FeedPlace | undefined;
    openOverlay(
      (rootProps, close) => (
        <PlacePickOverlay
          {...rootProps}
          places={places}
          initialPicks={picks.current}
          onPicked={(placeId) => {
            picks.current = { ...picks.current, [placeId]: true };
          }}
          hasBunch={hasBunch()}
          asBunch={asLatestBunch}
          onCancelPick={(place) => {
            cancelTarget = place;
            close();
          }}
        />
      ),
      // 시트가 다 닫힌 뒤 확인 창을 열어 초점이 위치 버튼으로 돌아가게 함
      () => {
        if (cancelTarget) openPickCancel(cancelTarget, places);
      },
    );
  }

  const openMembers = (members: FeedBundleMember[]) => {
    let memberHref: string | undefined;
    openOverlay(
      (rootProps, close) => (
        <BundleMembersSheet
          {...rootProps}
          members={members.map((member) => {
            if (member.left) return { name: text.leftMember, imageSrc: DELETED_USER_IMAGE };
            const href = member.id ? FEED_PATHS.member(member.id) : undefined;
            return {
              name: member.name,
              imageSrc: member.imageSrc,
              memberRole: member.role,
              roleLabel: member.role ? text.roleLabels[member.role] : undefined,
              renderLink: href
                ? ({ className, children }) => (
                    <Link
                      href={href}
                      className={className}
                      onClick={(event) => {
                        // 새 탭 열기 같은 보조 키 클릭은 링크 기본 동작대로
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                          return;
                        event.preventDefault();
                        memberHref = href;
                        close();
                      }}
                    >
                      {children}
                    </Link>
                  )
                : undefined,
            };
          })}
        />
      ),
      // 시트가 다 닫힌 뒤 이동해 전환 중 시트가 남지 않게 함
      () => {
        if (memberHref) router.push(memberHref);
      },
    );
  };

  return { openPlaces, openMembers };
}
