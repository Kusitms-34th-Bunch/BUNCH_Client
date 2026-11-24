import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BundleDetailPage, { generateStaticParams } from './page';

const query = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => query.current,
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

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

const renderPage = async (values: { focus?: string | string[]; section?: string | string[] }) => {
  query.current = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    for (const item of [value].flat()) query.current.append(key, item);
  return render(
    await BundleDetailPage({ params: Promise.resolve({ bunchId: '3', bundleId: '901' }) }),
  );
};

describe('/bunches/[bunchId]/bundles/[bundleId] page', () => {
  it('서버 ID 형식이 아닌 주소는 404', async () => {
    await expect(
      BundleDetailPage({ params: Promise.resolve({ bunchId: '3', bundleId: 'abc' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(
      BundleDetailPage({ params: Promise.resolve({ bunchId: '0', bundleId: '901' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('처음 방문 때 그려 두는 정적 화면(빌드 때 그리는 경로 없음)', () => {
    expect(generateStaticParams()).toEqual([]);
  });

  it.each([
    ['comments', true],
    ['other', false],
    [['comments', 'other'], false],
    [undefined, false],
  ])('focus=%j이면 댓글 초점 %s', async (focus, expected) => {
    await renderPage(focus === undefined ? {} : { focus });
    expect(screen.getByText(`3/901:${String(expected)}:false`)).toBeInTheDocument();
  });

  it.each([
    ['comments', true],
    ['other', false],
    [['comments', 'other'], false],
  ])('section=%j이면 댓글 영역 스크롤만 %s', async (section, expected) => {
    await renderPage({ section });
    expect(screen.getByText(`3/901:false:${String(expected)}`)).toBeInTheDocument();
  });
});
