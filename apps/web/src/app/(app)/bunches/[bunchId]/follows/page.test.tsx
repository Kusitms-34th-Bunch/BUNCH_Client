import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OtherBunchFollowsPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  OtherBunchFollows: ({ bunchId, initialTab }: { bunchId: string; initialTab: string }) => (
    <div data-testid="follows">{`${bunchId}:${initialTab}`}</div>
  ),
}));

describe('/bunches/[bunchId]/follows page', () => {
  it('전환 경계를 고정 id로 지정하고 번치 id와 탭을 넘긴다', async () => {
    const page = await OtherBunchFollowsPage({
      params: Promise.resolve({ bunchId: '4' }),
      searchParams: Promise.resolve({ tab: 'following' }),
    });
    render(page);

    expect(page.props).toMatchObject({ 'data-ssgoi-transition': '/bunches/profile/follows' });
    expect(screen.getByTestId('follows')).toHaveTextContent('4:following');
    expect(metadata.robots).toEqual({ index: false });
  });
});
