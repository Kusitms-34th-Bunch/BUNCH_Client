import { describe, expect, it, vi } from 'vitest';
import BundleEditPhotoAddPage, { metadata } from './page';

vi.mock('./BundleEditPhotoAddRoute', () => ({ BundleEditPhotoAddRoute: () => null }));

describe('/bunches/[bunchId]/bundles/[bundleId]/edit/photos/add page', () => {
  it('전환 경계(data-ssgoi-transition)를 수정 중 사진 추가 id로 지정한다', () => {
    expect(BundleEditPhotoAddPage().props).toMatchObject({
      'data-ssgoi-transition': '/bundles/edit/photo-add',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
