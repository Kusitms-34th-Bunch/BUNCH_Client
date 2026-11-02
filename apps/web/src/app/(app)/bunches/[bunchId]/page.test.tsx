import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OtherBunchPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  OtherBunch: ({ bunchId }: { bunchId: string }) => <div data-testid="other-bunch">{bunchId}</div>,
}));

describe('/bunches/[bunchId] page', () => {
  it('전환 경계를 다른 번치 프로필 id로 지정하고 route의 번치 id를 넘긴다', async () => {
    const page = await OtherBunchPage({ params: Promise.resolve({ bunchId: 'bunch-book' }) });
    render(page);

    expect(page.props).toMatchObject({ 'data-ssgoi-transition': '/bunches/profile' });
    expect(screen.getByTestId('other-bunch')).toHaveTextContent('bunch-book');
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
