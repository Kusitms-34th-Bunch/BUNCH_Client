import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchNotificationsPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  BunchNotifications: () => <div data-testid="bunch-notifications" />,
}));

describe('/bunch/notifications page', () => {
  it('전환 경계(data-ssgoi-transition)를 알림 경로로 지정한다', () => {
    expect(BunchNotificationsPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/notifications',
    });
  });

  it('알림 화면을 그린다', () => {
    render(<BunchNotificationsPage />);

    expect(screen.getByTestId('bunch-notifications')).toBeInTheDocument();
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
