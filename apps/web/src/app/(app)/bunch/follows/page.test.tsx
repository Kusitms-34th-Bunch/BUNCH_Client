import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BunchFollowsPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  MyBunchFollows: ({ initialTab }: { initialTab: string }) => (
    <div data-testid="follows">{initialTab}</div>
  ),
}));

describe('/bunch/follows page', () => {
  it('tab=following이면 팔로잉 탭, 그 밖의 값은 팔로워 탭으로 연다', async () => {
    const following = await BunchFollowsPage({
      searchParams: Promise.resolve({ tab: 'following' }),
    });
    const { unmount } = render(following);
    expect(following.props).toMatchObject({ 'data-ssgoi-transition': '/bunch/follows' });
    expect(screen.getByTestId('follows')).toHaveTextContent('following');
    unmount();

    render(await BunchFollowsPage({ searchParams: Promise.resolve({ tab: ['x', 'following'] }) }));
    expect(screen.getByTestId('follows')).toHaveTextContent('followers');
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
