import { describe, expect, it, vi } from 'vitest';
import BundleDraftPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraft: () => null }));

describe('/bunch/drafts/[draftId] page', () => {
  it('작성 화면을 그린다', () => {
    expect(BundleDraftPage().type).toBeTypeOf('function');
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
