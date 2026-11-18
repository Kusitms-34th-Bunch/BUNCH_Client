import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BundleDetailPage from './page';

vi.mock('./BundleDetailRoute', () => ({
  BundleDetailRoute: ({
    bunchId,
    bundleId,
    focusComments,
    showComments,
  }: {
    bunchId: string;
    bundleId: string;
    focusComments: boolean;
    showComments: boolean;
  }) => <p>{`${bunchId}/${bundleId}:${String(focusComments)}:${String(showComments)}`}</p>,
}));

const renderPage = async (query: { focus?: string | string[]; section?: string | string[] }) =>
  render(
    await BundleDetailPage({
      params: Promise.resolve({ bunchId: '3', bundleId: 'b1' }),
      searchParams: Promise.resolve(query),
    }),
  );

describe('/bunches/[bunchId]/bundles/[bundleId] page', () => {
  it.each([
    ['comments', true],
    ['other', false],
    [['comments', 'other'], false],
    [undefined, false],
  ])('focus=%j이면 댓글 초점 %s', async (focus, expected) => {
    await renderPage(focus === undefined ? {} : { focus });
    expect(screen.getByText(`3/b1:${String(expected)}:false`)).toBeInTheDocument();
  });

  it.each([
    ['comments', true],
    ['other', false],
    [['comments', 'other'], false],
  ])('section=%j이면 댓글 영역 스크롤만 %s', async (section, expected) => {
    await renderPage({ section });
    expect(screen.getByText(`3/b1:false:${String(expected)}`)).toBeInTheDocument();
  });
});
