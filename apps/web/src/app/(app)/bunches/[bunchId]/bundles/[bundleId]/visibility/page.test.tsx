import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BundleVisibilityPage, { metadata } from './page';

vi.mock('./BundleVisibilityRoute', () => ({
  BundleVisibilityRoute: ({ bunchId, bundleId }: { bunchId: string; bundleId: string }) => (
    <p>{`${bunchId}/${bundleId}`}</p>
  ),
}));

describe('/bunches/[bunchId]/bundles/[bundleId]/visibility page', () => {
  it('주소의 번치·번들 ID를 화면에 넘기고 전환 경계를 둔다', async () => {
    const { container } = render(
      await BundleVisibilityPage({ params: Promise.resolve({ bunchId: '1', bundleId: '7' }) }),
    );

    expect(screen.getByText('1/7')).toBeInTheDocument();
    expect(container.firstElementChild?.getAttribute('data-ssgoi-transition')).toBe(
      '/bundles/visibility',
    );
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});
