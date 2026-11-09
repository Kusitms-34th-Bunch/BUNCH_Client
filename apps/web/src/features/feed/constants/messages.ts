export const FEED_MESSAGES = {
  title: '피드',
  /** 로고 버튼(맨 위로) */
  scrollTop: 'BUNCH, 맨 위로',
  notifications: '알림',
  currentBunch: (name: string) => `${name} 번치 홈`,
  followingDone: '팔로우한 번치의 소식을 모두 확인했어요',
  allDone: '모든 피드를 확인했어요',
  /** 소속 번치가 없을 때 번치 명의 행동(기능명세서 6.1.7) */
  joinRequired: '번치에 참여하면 할 수 있어요.',
  /** 내 정보를 받지 못해 번치 명의 행동을 할 수 없을 때 */
  actionFailed: '일시적인 오류가 발생했어요. 다시 시도해 주세요',
} as const;
