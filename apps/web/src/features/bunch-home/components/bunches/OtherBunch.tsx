'use client';

import { notFound } from 'next/navigation';
import { useState } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { findOtherBunch } from '../../fixtures/otherBunches.fixture';
import { useBlockRelation } from '../../hooks/useBlockRelation';
import { useBunchFollow } from '../../hooks/useBunchFollow';
import { useBunchMembers } from '../../hooks/useBunchMembers';
import { BlockedBunchScreen } from './BlockedBunchScreen';
import { OtherBunchMoreMenu } from './OtherBunchMoreMenu';
import { OtherBunchScreen } from './OtherBunchScreen';

/**
 * `/bunches/[bunchId]` 다른 번치 프로필: 팔로우·요청·취소는 메모리 저장소(서버 처리는 팔로우 API 연결 때)
 * 팔로우·차단·신고 명의는 지금 번치(번치 전환 기준). 없는 번치는 404, 차단한 번치는 접근 제한 화면
 */
export function OtherBunch({ bunchId }: { bunchId: string }) {
  const backOr = useBackOr();
  const bunch = findOtherBunch(bunchId);
  const { status, followerCount, follow, unfollow } = useBunchFollow(bunch);
  const { me, checking, isBlocked, block } = useBlockRelation(bunchId);
  // 멤버 관리에서 바뀐 역할 우선(권한 표: 차단은 메인·공동 관리자, 차단 목록 화면과 같은 기준)
  const myRole = useBunchMembers(me?.id).myRole ?? me?.myRole;
  // 이 화면에서 차단해 접근 제한 화면으로 바뀌면 제목으로 초점
  const [justBlocked, setJustBlocked] = useState(false);
  if (!bunch) notFound();

  // 직접 진입이라 돌아갈 기록이 없으면 피드로(지금 입구가 피드 임시 링크)
  const back = () => backOr(BUNCH_HOME_PATHS.feed);
  if (checking) return <BlockedBunchScreen onBack={back} checking />;
  if (isBlocked) return <BlockedBunchScreen onBack={back} focusTitle={justBlocked} />;

  return (
    <OtherBunchScreen
      bunch={bunch}
      status={status}
      followerCount={followerCount}
      onBack={back}
      // 내 번치(역할)를 알기 전에는 메뉴 항목이 바뀔 수 있어 더보기를 숨김
      more={
        me && (
          <OtherBunchMoreMenu
            bunchName={bunch.name}
            bunchImageSrc={bunch.imageSrc}
            canBlock={myRole === 'owner' || myRole === 'coOwner'}
            reporterName={me.name}
            onBlock={() => {
              // 차단하면 팔로우 관계도 해제(화면설계서 2500:67470 2번)
              block({ id: bunch.id, name: bunch.name, imageSrc: bunch.imageSrc });
              unfollow();
              setJustBlocked(true);
            }}
            // 신고 API 연결 전이라 접수 안내만(시트가 토스트를 띄움)
            onReport={() => {}}
          />
        )
      }
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}
