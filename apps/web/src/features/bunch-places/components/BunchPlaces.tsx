'use client';

import { toast } from '@app/design-system';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { QueryBoundary } from '@/shared/components/boundary/QueryBoundary';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { copyText } from '@/shared/lib/clipboard';
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
};

const NO_OP = () => undefined;
const NOT_READY = () => Promise.resolve(false);

/**
 * `/bunch/places` 콕한 장소: 지금 번치의 콕 목록(`GET /pinned-places`)과 받는 중·실패 처리
 * 클립보드·토스트·이동 같은 부수 효과를 소유하고 화면은 `BunchPlacesScreen`이 그림
 */
export function BunchPlaces({ backHref, feedHref }: BunchPlacesProps) {
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
      <PlacesOfMyBunch pending={screenOf()} backHref={backHref} feedHref={feedHref} />
    </QueryBoundary>
  );
}

/** 내 정보로 지금 번치를 알아낸 뒤 그 번치의 콕을 받음. 번치가 없는 회원은 번치 탭(번치 없음 안내)으로 */
function PlacesOfMyBunch({
  pending,
  backHref,
  feedHref,
}: BunchPlacesProps & { pending: ReactNode }) {
  const router = useRouter();
  const { data: me } = useSuspenseQuery(myProfileQueryOptions());
  const bunchId = me.bunch?.id;
  useEffect(() => {
    if (!bunchId) router.replace(backHref);
  }, [bunchId, backHref, router]);

  return bunchId ? (
    <PlaceList bunchId={bunchId} backHref={backHref} feedHref={feedHref} />
  ) : (
    pending
  );
}

function PlaceList({ bunchId, backHref, feedHref }: BunchPlacesProps & { bunchId: string }) {
  const router = useRouter();
  const backOr = useBackOr();
  const { members, counts, places, selectedId, restored, select, isSwitching, remove, restore } =
    useBunchPlaces(bunchId);

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
      places={places}
      restored={restored}
      busy={isSwitching}
      onBack={() => backOr(backHref)}
      onCopyAddress={copyAddress}
      onCopyDone={copyDone}
      onRemove={removePlace}
      onBrowseFeed={() => router.push(feedHref)}
    />
  );
}
