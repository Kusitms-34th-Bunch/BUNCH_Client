import type { NotificationSettings } from '../lib/types';

// 알림 설정 API가 계약에 없어 연결 전 예시 값 사용(모두 켜짐)
export const notificationSettingsFixture: NotificationSettings = {
  push: true,
  types: { bundle: true, member: true, follow: true, reaction: true },
};
