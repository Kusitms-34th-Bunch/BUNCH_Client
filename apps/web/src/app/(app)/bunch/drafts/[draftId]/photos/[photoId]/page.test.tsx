import { describe, expect, it, vi } from 'vitest';
import BundleDraftPhotoPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraftPhotoCaption: () => null }));

const renderPage = async (photoId: string) =>
  BundleDraftPhotoPage({ params: Promise.resolve({ photoId }) });

describe('/bunch/drafts/[draftId]/photos/[photoId] page', () => {
  it('전환 경계(data-ssgoi-transition)를 사진 캡션 id로 지정한다', async () => {
    expect((await renderPage('photo-1')).props).toMatchObject({
      'data-ssgoi-transition': '/bunch/drafts/photo',
    });
  });

  it('형식이 맞는 사진 id를 화면에 넘긴다', async () => {
    const element = await renderPage('photo-1');

    expect(element.props).toMatchObject({
      children: { props: { photoId: 'photo-1' } },
    });
  });

  it('형식이 틀린 사진 id는 undefined로 넘긴다', async () => {
    const element = await renderPage('../x');

    expect(element.props).toMatchObject({
      children: { props: { photoId: undefined } },
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
