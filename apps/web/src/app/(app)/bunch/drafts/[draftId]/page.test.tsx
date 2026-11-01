import { describe, expect, it, vi } from 'vitest';
import BundleDraftPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraft: () => null }));

const render = async (draftId: string) => {
  const element = await BundleDraftPage({ params: Promise.resolve({ draftId }) });
  return element.props as { draftId: string | undefined };
};

describe('/bunch/drafts/[draftId] page', () => {
  it('형식이 맞는 id는 그대로 화면에 넘긴다', async () => {
    expect((await render('draft-1')).draftId).toBe('draft-1');
  });

  it('형식이 틀린 id는 undefined로 바꿔 넘긴다', async () => {
    expect((await render('../secret')).draftId).toBeUndefined();
    expect((await render('x'.repeat(65))).draftId).toBeUndefined();
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
