// 번치 홈 feature의 query key(응답을 바꾸는 입력은 모두 key에 포함, docs/architecture/data-layer.md)
// 내 번치 홈 key는 여러 feature가 무효화해 `sharedKeys.bunchHome*`에 있음
export const bunchHomeKeys = {
  all: ['bunch-home'] as const,
  // 다른 번치는 팔로우 상태·열람 범위가 지금 내 번치(명의)에 따라 달라 명의 번치를 key에 둠, 기기 저장 안 함
  otherBunch: (targetId: string) => [...bunchHomeKeys.all, 'other', targetId] as const,
  otherBunchHome: (targetId: string, viewerId: string | null) =>
    [...bunchHomeKeys.otherBunch(targetId), viewerId, 'home'] as const,
  otherBunchPublished: (targetId: string, viewerId: string | null) =>
    [...bunchHomeKeys.otherBunch(targetId), viewerId, 'published'] as const,
  // 팔로워·팔로잉·요청 목록. 행의 팔로우 상태가 명의마다 달라 명의 번치를 key에 둠. 팔로우가 바뀌면 전체 무효화
  follows: () => [...bunchHomeKeys.all, 'follows'] as const,
  followList: (bunchId: string, viewerId: string | null, kind: 'followers' | 'following') =>
    [...bunchHomeKeys.follows(), bunchId, viewerId, kind] as const,
  followRequests: (viewerId: string | undefined) =>
    [...bunchHomeKeys.follows(), 'requests', viewerId] as const,
  // 내 번치(명의)가 차단한 번치 목록. 차단·해제 뒤 무효화
  blocks: (viewerId: string | undefined) => [...bunchHomeKeys.all, 'blocks', viewerId] as const,
};
