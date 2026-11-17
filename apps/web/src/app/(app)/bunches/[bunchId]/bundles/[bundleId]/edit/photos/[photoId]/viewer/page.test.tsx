import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import BundleEditPhotoViewerPage, { metadata } from './page';

vi.mock('./BundleEditPhotoViewerRoute', () => ({ BundleEditPhotoViewerRoute: () => null }));

type Wrapper = ReactElement<{ 'data-ssgoi-transition': string; children: ReactElement }>;

describe('/bunches/[bunchId]/bundles/[bundleId]/edit/photos/[photoId]/viewer page', () => {
  it('형식이 맞는 사진 id를 화면에 넘기고 수정 화면과 전환 경계를 맞춘다', async () => {
    const element = (await BundleEditPhotoViewerPage({
      params: Promise.resolve({ photoId: 'photo-1' }),
    })) as Wrapper;

    expect(element.props.children.props).toEqual({ photoId: 'photo-1' });
    expect(element.props['data-ssgoi-transition']).toBe('/bundles/edit/photo-viewer');
  });

  it('형식이 틀린 사진 id는 undefined로 넘긴다', async () => {
    const element = (await BundleEditPhotoViewerPage({
      params: Promise.resolve({ photoId: '../x' }),
    })) as Wrapper;

    expect(element.props.children.props).toEqual({ photoId: undefined });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
