import { describe, expect, it, vi } from 'vitest';
import RecommendViewerPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ RecommendViewer: () => null }));

const render = async (recommendationId: string, photoId: string) => {
  const element = await RecommendViewerPage({
    params: Promise.resolve({ recommendationId, photoId }),
  });
  return element.props as { recommendationId: string | undefined; photoId: string | undefined };
};

describe('/bunch/bundles/new/recommendations/[recommendationId]/photos/[photoId] page', () => {
  it('형식이 맞는 id는 그대로 화면에 넘긴다', async () => {
    expect(await render('rec-1', 'photo-3')).toEqual({
      recommendationId: 'rec-1',
      photoId: 'photo-3',
    });
  });

  it('형식이 틀린 id는 각각 undefined로 바꿔 넘긴다', async () => {
    expect(await render('../x', 'photo-3')).toEqual({
      recommendationId: undefined,
      photoId: 'photo-3',
    });
    expect(await render('rec-1', 'a/b')).toEqual({ recommendationId: 'rec-1', photoId: undefined });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
