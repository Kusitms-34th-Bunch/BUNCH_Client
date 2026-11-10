import { describe, expect, it, vi } from 'vitest';
import BundleDraftVisibilityPage, { metadata } from './page';

vi.mock('./BunchVisibilityRoute', () => ({ BunchVisibilityRoute: () => null }));

describe('/bunch/drafts/[draftId]/visibility page', () => {
  it('전환 경계(data-ssgoi-transition)를 공개 범위 경로로 지정한다', () => {
    expect(BundleDraftVisibilityPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/drafts/visibility',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
