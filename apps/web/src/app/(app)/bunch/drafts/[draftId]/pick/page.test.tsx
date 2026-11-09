import { describe, expect, it, vi } from 'vitest';
import BundleDraftPickPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraftPick: () => null }));

describe('/bunch/drafts/[draftId]/pick page', () => {
  it('전환 경계(data-ssgoi-transition)를 픽하기 id로 지정한다', () => {
    expect(BundleDraftPickPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/drafts/pick',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
