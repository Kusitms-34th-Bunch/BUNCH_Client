import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BunchNotificationsScreen } from './BunchNotificationsScreen';

describe('BunchNotificationsScreen 설정 안내 줄', () => {
  it('누르면 알림 설정(MY 7.3)으로 가는 링크다(5.12.1 상세 3)', () => {
    render(
      <BunchNotificationsScreen
        bunchName="여행쥬아"
        notifications={[]}
        hasUnread={false}
        onBack={vi.fn()}
        onReadAll={vi.fn(() => Promise.resolve())}
        onOpen={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('link', { name: BUNCH_HOME_MESSAGES.notificationSettingsNudge }),
    ).toHaveAttribute('href', '/my/notifications');
  });
});
