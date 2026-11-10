import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeedHeader } from './FeedHeader';

const props = { onLogoClick: () => {}, notificationsHref: '/n', bunchHomeHref: '/bunch' };
const placeholder = () => screen.queryByTestId('feed-bunch-placeholder');

describe('FeedHeader', () => {
  it('내 정보를 받는 중에는 번치 이미지 자리에 회색 원을 둔다', () => {
    render(<FeedHeader {...props} viewer={undefined} viewerPending />);

    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(placeholder()).toHaveAttribute('aria-hidden', 'true');
  });

  it('받으면 번치 이미지 링크, 실패하면 알림만, 번치가 없으면 로고만', () => {
    const { rerender } = render(
      <FeedHeader {...props} viewer={{ bunchId: 'b', name: '여행가조' }} viewerPending={false} />,
    );
    expect(screen.getByRole('link', { name: '여행가조 번치 홈' })).toHaveAttribute(
      'href',
      '/bunch',
    );
    expect(placeholder()).toBeNull();

    rerender(<FeedHeader {...props} viewer={undefined} viewerPending={false} />);
    expect(screen.getByRole('link', { name: '알림' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /번치 홈/ })).toBeNull();
    expect(placeholder()).toBeNull();

    rerender(<FeedHeader {...props} viewer={null} viewerPending={false} />);
    expect(screen.queryByRole('link', { name: '알림' })).toBeNull();
  });
});
