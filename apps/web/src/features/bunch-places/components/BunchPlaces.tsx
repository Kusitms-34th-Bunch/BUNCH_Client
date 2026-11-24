'use client';

import { toast } from '@app/design-system';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { openTabPath } from '@/shared/bridge/client';
import { QueryBoundary } from '@/shared/components/boundary/QueryBoundary';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { useMountedRef } from '@/shared/hooks/useMountedRef';
import { copyText } from '@/shared/lib/native/clipboard';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/profile/bunchProfile';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { PLACES_MESSAGES } from '../constants/messages';
import { UNDO_DURATION, useBunchPlaces } from '../hooks/useBunchPlaces';
import { copyTextOf } from '../lib/places';
import { ALL_MEMBERS, type KokPlace } from '../lib/types';
import { BunchPlacesScreen } from './BunchPlacesScreen';

type BunchPlacesProps = {
  /** 뒤로 가기 기본 이동(들어온 기록이 없을 때): 번치 메인 */
  backHref: string;
  /** 빈 상태 「피드 둘러보기」 이동: 피드 탭 */
  feedHref: string;
  /** 카드를 눌러 갈 번들 상세 주소(다른 기능의 경로라 route가 넘김) */
  bundleHref: (_bunchId: string, _bundleId: string) => string;
  /**
   * 이동 전에 그 번들을 지금 볼 수 있는지 서버에 다시 확인(기능명세서 8.1.5 로직 1). 다른 기능의 조회라 route가 조합
   * 볼 수 없으면 `hidden`, 확인 요청 자체가 실패하면 reject
   */
  checkBundle: (_bunchId: string, _bundleId: string) => Promise<'visible' | 'hidden'>;
};

const NO_OP = () => undefined;
const NOT_READY = () => Promise.resolve(false);

/**
 * `/bunch/places` 콕한 장소: 지금 번치의 콕 목록(`GET /pinned-places`)과 받는 중·실패 처리
 * 클립보드·토스트·이동 같은 부수 효과를 소유하고 화면은 `BunchPlacesScreen`이 그림
 */
export function BunchPlaces({ backHref, feedHref, bundleHref, checkBundle }: BunchPlacesProps) {
  const backOr = useBackOr();
  const back = () => backOr(backHref);
  // 받는 중·실패 화면: 헤더만 두고 동작은 막음
  const screenOf = (onRetry?: () => void) => (
    <BunchPlacesScreen
      members={[]}
      counts={{}}
      selectedId={ALL_MEMBERS}
      onSelect={NO_OP}
      places={undefined}
      onRetry={onRetry}
      onBack={back}
      onCopyAddress={NOT_READY}
      onCopyDone={NO_OP}
      onRemove={NO_OP}
      onBrowseFeed={NO_OP}
    />
  );

  return (
    <QueryBoundary
      pending={screenOf()}
      pendingLabel={PLACES_MESSAGES.loading}
      failed={(retry) => screenOf(retry)}
    >
      <PlacesOfMyBunch
        pending={screenOf()}
        backHref={backHref}
        feedHref={feedHref}
        bundleHref={bundleHref}
        checkBundle={checkBundle}
      />
    </QueryBoundary>
  );
}

/** 내 정보로 지금 번치를 알아낸 뒤 그 번치의 콕을 받음. 번치가 없는 회원은 번치 탭(번치 없음 안내)으로 */
function PlacesOfMyBunch({
  pending,
  backHref,
  ...links
}: BunchPlacesProps & { pending: ReactNode }) {
  const router = useRouter();
  const { data: me } = useSuspenseQuery(myProfileQueryOptions());
  const bunchId = me.bunch?.id;
  useEffect(() => {
    if (!bunchId) router.replace(backHref);
  }, [bunchId, backHref, router]);

  return bunchId ? <PlaceList bunchId={bunchId} backHref={backHref} {...links} /> : pending;
}

function PlaceList({
  bunchId,
  backHref,
  feedHref,
  bundleHref,
  checkBundle,
}: BunchPlacesProps & { bunchId: string }) {
  const router = useRouter();
  const backOr = useBackOr();
  const {
    members,
    counts,
    places,
    selectedId,
    restored,
    select,
    isSwitching,
    remove,
    restore,
    hasMore,
    listVersion,
    loadingMore,
    loadMore,
  } = useBunchPlaces(bunchId);
  // 눌렀을 때 볼 수 없게 된 카드: 이 화면에 있는 동안 「볼 수 없는 번들이에요」로 보임(기능명세서 8.1.6 상세 4). 다시 들어오면 서버 값으로
  const [hiddenSources, setHiddenSources] = useState<ReadonlySet<string>>(new Set());
  // 확인하는 동안 다시 누르면 무시(첫 탭만, 기능명세서 8.1.5 예외). 이동하면 화면을 떠나므로 잠금을 풀지 않음
  const opening = useRef(false);
  // 확인을 기다리는 사이 화면을 떠났으면 이동·안내를 하지 않음
  const mounted = useMountedRef();

  const openBundle = async (place: KokPlace): Promise<'unavailable' | undefined> => {
    if (place.source.kind !== 'bundle' || opening.current) return undefined;
    const { bunchId: sourceBunchId, bundleId } = place.source;
    opening.current = true;
    let result: 'visible' | 'hidden' | 'failed';
    try {
      result = await checkBundle(sourceBunchId, bundleId);
    } catch {
      result = 'failed';
    }
    if (!mounted.current) return undefined;
    if (result === 'visible') {
      router.push(bundleHref(sourceBunchId, bundleId));
      return undefined;
    }
    opening.current = false;
    if (result === 'failed') {
      // 확인하지 못하면 이동하지 않음(8.1.5 예외)
      toast(PLACES_MESSAGES.error);
      return undefined;
    }
    setHiddenSources((current) => new Set(current).add(place.id));
    return 'unavailable';
  };

  // 클립보드 쓰기는 누른 순간에 하고(사용자 제스처), 결과 토스트는 시트가 닫힌 뒤 화면이 부름
  const copyAddress = (place: KokPlace) => copyText(copyTextOf(place));

  const copyDone = (copied: boolean) => {
    if (copied) {
      toast(PLACES_MESSAGES.addressCopied, { icon: 'success' });
    } else {
      toast(PLACES_MESSAGES.error);
    }
  };

  const removePlace = (place: KokPlace) => {
    remove(place);
    toast(PLACES_MESSAGES.removed, {
      icon: 'success',
      // 되돌리기를 누를 수 있는 동안만 삭제 요청을 보류하므로 노출 시간을 맞춤
      duration: UNDO_DURATION,
      action: { label: PLACES_MESSAGES.undo, onClick: () => restore(place.id) },
    });
  };

  return (
    <BunchPlacesScreen
      members={members.map((member) => ({
        ...member,
        avatarSrc: member.avatarSrc ?? DEFAULT_PROFILE_IMAGE,
      }))}
      counts={counts}
      selectedId={selectedId}
      onSelect={select}
      places={places.map((place) =>
        hiddenSources.has(place.id)
          ? { ...place, source: { kind: 'unavailable' as const } }
          : place,
      )}
      restored={restored}
      busy={isSwitching}
      onBack={() => backOr(backHref)}
      onCopyAddress={copyAddress}
      onCopyDone={copyDone}
      onRemove={removePlace}
      onOpenBundle={openBundle}
      hasMore={hasMore}
      listVersion={listVersion}
      loadingMore={loadingMore}
      onLoadMore={loadMore}
      // 피드는 다른 탭 첫 화면이라 iOS 쉘에서는 피드 탭으로 전환
      onBrowseFeed={() => openTabPath(feedHref, (href) => router.push(href))}
    />
  );
}
