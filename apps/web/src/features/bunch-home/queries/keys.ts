import { sharedKeys } from '@/shared/query/keys';

// 번치 홈 feature의 query key(응답을 바꾸는 입력은 모두 key에 포함, docs/architecture/data-layer.md)
// 내 번치 홈 key는 `sharedKeys.bunchHome*`, 쪽 단위 목록은 그 목록 key 아래 'infinite'(앞부분으로 함께 무효화)
export const bunchHomeKeys = {
  all: ['bunch-home'] as const,
  // 다른 번치는 팔로우 상태·열람 범위가 지금 내 번치(명의)에 따라 달라 명의 번치를 key에 둠, 기기 저장 안 함
  otherBunch: (targetId: string) => [...bunchHomeKeys.all, 'other', targetId] as const,
  otherBunchHome: (targetId: string, viewerId: string | null) =>
    [...bunchHomeKeys.otherBunch(targetId), viewerId, 'home'] as const,
  otherBunchPublished: (targetId: string, viewerId: string | null) =>
    [...bunchHomeKeys.otherBunch(targetId), viewerId, 'published'] as const,
  otherBunchPublishedPages: (targetId: string, viewerId: string | null) =>
    [...bunchHomeKeys.otherBunchPublished(targetId, viewerId), 'infinite'] as const,
  // 내 번치 홈 「완성된 번들」(번치 홈 key 아래라 번들 발행 뒤 함께 무효화)
  publishedPages: (bunchId: string | undefined) =>
    [...sharedKeys.publishedBundles(bunchId), 'infinite'] as const,
  otherBunchMembers: (targetId: string, viewerId: string | null) =>
    [...bunchHomeKeys.otherBunch(targetId), viewerId, 'members'] as const,
  // 팔로워·팔로잉·요청 목록. 행의 팔로우 상태가 명의마다 달라 명의 번치를 key에 둠. 팔로우가 바뀌면 전체 무효화
  follows: () => [...bunchHomeKeys.all, 'follows'] as const,
  followList: (bunchId: string, viewerId: string | null, kind: 'followers' | 'following') =>
    [...bunchHomeKeys.follows(), bunchId, viewerId, kind] as const,
  followPages: (bunchId: string, viewerId: string | null, kind: 'followers' | 'following') =>
    [...bunchHomeKeys.followList(bunchId, viewerId, kind), 'infinite'] as const,
  followRequests: (viewerId: string | undefined) =>
    [...bunchHomeKeys.follows(), 'requests', viewerId] as const,
  // mutation key: 진행 중인 같은 종류 요청 수를 셀 때(isMutating) 씀
  decideFollowRequest: (viewerId: string | undefined) =>
    [...bunchHomeKeys.followRequests(viewerId), 'decide'] as const,
  changeFollow: (viewerId: string | null | undefined) =>
    [...bunchHomeKeys.follows(), 'change', viewerId ?? null] as const,
  // 번치 전환 중인지(저장 전 번치 홈 다시 받기를 멈출 때)
  switchBunch: () => [...bunchHomeKeys.all, 'switch'] as const,
  // 내 번치(명의)가 차단한 번치 목록. 차단·해제 뒤 무효화
  blocks: (viewerId: string | undefined) => [...bunchHomeKeys.all, 'blocks', viewerId] as const,
  blockPages: (viewerId: string | undefined) =>
    [...bunchHomeKeys.blocks(viewerId), 'infinite'] as const,
  // 삭제·내보내진 번치 안내 한 건(계정 단위라 번치를 두지 않음)
  accessNotice: (noticeId: string | undefined) =>
    [...bunchHomeKeys.all, 'access-notice', noticeId] as const,
  // 내 번치의 알림 목록. 열기·모두 읽음 뒤 무효화(읽지 않은 수는 번치 홈·전환 목록도 함께)
  notifications: (bunchId: string | undefined) =>
    [...bunchHomeKeys.all, 'notifications', bunchId] as const,
  notificationPages: (bunchId: string | undefined) =>
    [...bunchHomeKeys.notifications(bunchId), 'infinite'] as const,
};
