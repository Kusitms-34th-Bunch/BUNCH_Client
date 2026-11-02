import { describe, expect, it, vi } from 'vitest';
import BundleDraftPhotoAddPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraftPhotoAdd: () => null }));

describe('/bunch/drafts/[draftId]/photos/add page', () => {
  it('전환 경계(data-ssgoi-transition)를 사진 추가 id로 지정한다', () => {
    expect(BundleDraftPhotoAddPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/drafts/photo-add',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
