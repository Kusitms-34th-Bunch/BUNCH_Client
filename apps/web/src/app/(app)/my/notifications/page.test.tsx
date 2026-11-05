import { describe, expect, it, vi } from 'vitest';
import MyNotificationSettingsPage, { metadata } from './page';

vi.mock('@/features/my/components', () => ({ NotificationSettingsScreen: () => null }));

describe('/my/notifications page', () => {
  it('전환 경계(data-ssgoi-transition)를 알림 설정 경로로 지정한다', () => {
    expect(MyNotificationSettingsPage().props).toMatchObject({
      'data-ssgoi-transition': '/my/notifications',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
