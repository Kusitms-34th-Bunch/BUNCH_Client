/** MY 화면의 query key. 모든 key는 `all`에서 시작하고 쓰는 쪽은 이 함수만 호출함 */
export const myKeys = {
  all: ['my'] as const,
  /** 푸시 수신 설정(앱 푸시 전체와 알림 종류별 수신) */
  notificationSettings: () => [...myKeys.all, 'notification-settings'] as const,
};
