'use client';

import { useQuery } from '@tanstack/react-query';
import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { useFollowBunchMutation } from '@/features/bunch-home/queries/otherBunch';
import { type MemberFollowChange, MemberProfileScreen } from '@/features/feed/components';
import { myProfileQueryOptions } from '@/shared/query/myProfile';

// 멤버 프로필에서 번치 쪽 화면으로 가는 주소(기능끼리 직접 import하지 않고 route에서 조합)
const links = { bunchHome: BUNCH_HOME_PATHS.home, otherBunch: BUNCH_HOME_PATHS.otherBunch };

export function MemberProfileRoute({ memberId }: { memberId: string }) {
  // 팔로우는 번치 쪽 기능(지금 번치 명의, 실패 안내·번치 화면 갱신 포함)으로 보냄
  const { data: me } = useQuery(myProfileQueryOptions());
  const followBunch = useFollowBunchMutation(me === undefined ? undefined : (me.bunch?.id ?? null));
  const follow = (targetId: string, change: MemberFollowChange) =>
    followBunch.mutateAsync({ targetId, change });
  return <MemberProfileScreen memberId={memberId} links={links} follow={follow} />;
}
