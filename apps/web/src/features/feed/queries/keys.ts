// 응답을 바꾸는 입력은 모두 key에 포함(docs/architecture/data-layer.md)
// 목록·좋아요·댓글이 지금 번치(명의)에 따라 달라 명의를 key에 둠, 소속 번치가 없으면 null
export const feedKeys = {
  all: ['feed'] as const,
  // 피드 탭 목록(쪽 단위). 권한·차단이 바뀌면 이 앞부분으로 명의마다 다시 받음
  lists: () => [...feedKeys.all, 'list'] as const,
  list: (viewerId: string | null) => [...feedKeys.lists(), viewerId] as const,
  // 번들 하나의 상세·댓글은 이 아래(번들 ID는 주소 글자 그대로)
  bundle: (bundleId: string) => [...feedKeys.all, 'bundle', bundleId] as const,
  // 상세는 명의까지 앞에 두어, 어느 번치 주소로 열었든 그 명의의 상세를 앞부분으로 고름
  details: (bundleId: string, viewerId: string | null) =>
    [...feedKeys.bundle(bundleId), 'detail', viewerId] as const,
  detail: (bunchId: string, bundleId: string, viewerId: string | null) =>
    [...feedKeys.details(bundleId, viewerId), bunchId] as const,
  // 우리 번치 번들 조회(공개 범위 화면, 멤버 공개도 옴)
  managed: (bunchId: string, bundleId: string, viewerId: string | null) =>
    [...feedKeys.bundle(bundleId), 'managed', viewerId, bunchId] as const,
  // 번들 장소별 콕 여부. 같은 장소는 다른 번들에서 콕해도 콕한 것이라 명의 앞부분으로 함께 다시 받음
  koksOf: (viewerId: string | null) => [...feedKeys.all, 'koks', viewerId] as const,
  koks: (bundleId: string, viewerId: string | null) =>
    [...feedKeys.koksOf(viewerId), bundleId] as const,
  // 멤버 프로필(참여 번치의 팔로우 상태가 명의에 따라 달라 명의를 둠)
  memberAll: (memberId: string) => [...feedKeys.all, 'member', memberId] as const,
  member: (memberId: string, viewerId: string | null) =>
    [...feedKeys.memberAll(memberId), viewerId] as const,
  // 원댓글(쪽 단위)과 그 아래 답글. 쪽 데이터와 답글 배열이 같은 앞부분에 섞이므로 캐시를 고칠 때는 exact
  comments: (bundleId: string, viewerId: string | null) =>
    [...feedKeys.bundle(bundleId), 'comments', viewerId] as const,
  replies: (bundleId: string, viewerId: string | null, parentId: string) =>
    [...feedKeys.comments(bundleId, viewerId), 'replies', parentId] as const,
};
