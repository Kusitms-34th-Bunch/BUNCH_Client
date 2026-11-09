import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BundleDetailPage from './page';

vi.mock('./BundleDetailRoute', () => ({
  BundleDetailRoute: ({
    bundleId,
    focusComments,
  }: {
    bundleId: string;
    focusComments: boolean;
  }) => <p>{`${bundleId}:${String(focusComments)}`}</p>,
}));

const renderPage = async (focus?: string | string[]) =>
  render(
    await BundleDetailPage({
      params: Promise.resolve({ bundleId: 'b1' }),
      searchParams: Promise.resolve(focus === undefined ? {} : { focus }),
    }),
  );

describe('/bundles/[bundleId] page', () => {
  it.each([
    ['comments', true],
    ['other', false],
    [['comments', 'other'], false],
    [undefined, false],
  ])('focus=%j이면 댓글 초점 %s', async (focus, expected) => {
    await renderPage(focus);
    expect(screen.getByText(`b1:${String(expected)}`)).toBeInTheDocument();
  });
});
