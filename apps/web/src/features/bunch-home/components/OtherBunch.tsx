'use client';

import { notFound, useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { findOtherBunch } from '../fixtures/otherBunches.fixture';
import { useBunchFollow } from '../hooks/useBunchFollow';
import { OtherBunchScreen } from './OtherBunchScreen';

/**
 * `/bunches/[bunchId]` 다른 번치 프로필: 팔로우·요청·취소는 메모리 저장소(서버 처리는 팔로우 API 연결 때)
 * 팔로우 명의는 지금 번치(번치 전환 기준). 없는 번치는 404
 */
export function OtherBunch({ bunchId }: { bunchId: string }) {
  const router = useRouter();
  const bunch = findOtherBunch(bunchId);
  const { status, followerCount, follow, unfollow } = useBunchFollow(bunch);
  if (!bunch) notFound();

  return (
    <OtherBunchScreen
      bunch={bunch}
      status={status}
      followerCount={followerCount}
      // 직접 진입이라 돌아갈 기록이 없으면 피드로(지금 입구가 피드 임시 링크)
      onBack={() =>
        window.history.length > 1 ? router.back() : router.replace(BUNCH_HOME_PATHS.feed)
      }
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}
