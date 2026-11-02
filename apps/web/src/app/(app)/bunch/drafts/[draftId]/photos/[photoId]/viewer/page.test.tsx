import { describe, expect, it, vi } from 'vitest';
import BundleDraftPhotoViewerPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraftPhotoViewer: () => null }));

describe('/bunch/drafts/[draftId]/photos/[photoId]/viewer page', () => {
  it('형식이 맞는 사진 id를 화면에 넘긴다', async () => {
    const element = await BundleDraftPhotoViewerPage({
      params: Promise.resolve({ photoId: 'photo-1' }),
    });

    expect(element.props).toEqual({ photoId: 'photo-1' });
  });

  it('형식이 틀린 사진 id는 undefined로 넘긴다', async () => {
    const element = await BundleDraftPhotoViewerPage({
      params: Promise.resolve({ photoId: '../x' }),
    });

    expect(element.props).toEqual({ photoId: undefined });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
