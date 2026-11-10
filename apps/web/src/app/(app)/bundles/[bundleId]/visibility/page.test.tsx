import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BundleVisibilityPage, { metadata } from './page';

vi.mock('./BundleVisibilityRoute', () => ({
  BundleVisibilityRoute: ({ bundleId }: { bundleId: string }) => <p>{bundleId}</p>,
}));

describe('/bundles/[bundleId]/visibility page', () => {
  it('주소의 번들 ID를 화면에 넘기고 전환 경계를 둔다', async () => {
    const { container } = render(
      await BundleVisibilityPage({ params: Promise.resolve({ bundleId: 'bundle-1' }) }),
    );

    expect(screen.getByText('bundle-1')).toBeInTheDocument();
    expect(container.firstElementChild?.getAttribute('data-ssgoi-transition')).toBe(
      '/bundles/visibility',
    );
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});
