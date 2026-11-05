import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FollowRequestsPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  FollowRequests: () => <div data-testid="requests" />,
}));

describe('/bunch/follows/requests page', () => {
  it('전환 경계를 요청 목록 경로로 지정하고 화면을 그린다', () => {
    const page = FollowRequestsPage();
    render(page);

    expect(page.props).toMatchObject({ 'data-ssgoi-transition': '/bunch/follows/requests' });
    expect(screen.getByTestId('requests')).toBeInTheDocument();
    expect(metadata.robots).toEqual({ index: false });
  });
});
