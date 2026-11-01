import { describe, expect, it, vi } from 'vitest';
import RecommendDetailPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ RecommendDetail: () => null }));

type Wrapper = {
  'data-ssgoi-transition': string;
  children: { props: { recommendationId: string | undefined } };
};

const render = async (recommendationId: string) => {
  const element = await RecommendDetailPage({ params: Promise.resolve({ recommendationId }) });
  return element.props as Wrapper;
};

describe('/bunch/bundles/new/recommendations/[recommendationId] page', () => {
  it('형식이 맞는 id는 그대로 화면에 넘긴다', async () => {
    expect((await render('rec-1')).children.props.recommendationId).toBe('rec-1');
  });

  it('형식이 틀린 id는 undefined로 바꿔 넘긴다', async () => {
    expect((await render('../secret')).children.props.recommendationId).toBeUndefined();
    expect((await render('x'.repeat(65))).children.props.recommendationId).toBeUndefined();
  });

  it('전환 경계에 규칙과 같은 고정 id를 지정한다', async () => {
    expect((await render('rec-1'))['data-ssgoi-transition']).toBe(
      '/bunch/bundles/new/recommendation',
    );
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
