import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BundleDetailPage from './page';

vi.mock('./BundleDetailRoute', () => ({
  BundleDetailRoute: ({
    bunchId,
    bundleId,
    focusComments,
  }: {
    bunchId: string;
    bundleId: string;
    focusComments: boolean;
  }) => <p>{`${bunchId}/${bundleId}:${String(focusComments)}`}</p>,
}));

const renderPage = async (focus?: string | string[]) =>
  render(
    await BundleDetailPage({
      params: Promise.resolve({ bunchId: '3', bundleId: 'b1' }),
      searchParams: Promise.resolve(focus === undefined ? {} : { focus }),
    }),
  );

describe('/bunches/[bunchId]/bundles/[bundleId] page', () => {
  it.each([
    ['comments', true],
    ['other', false],
    [['comments', 'other'], false],
    [undefined, false],
  ])('focus=%j이면 댓글 초점 %s', async (focus, expected) => {
    await renderPage(focus);
    expect(screen.getByText(`3/b1:${String(expected)}`)).toBeInTheDocument();
  });
});
