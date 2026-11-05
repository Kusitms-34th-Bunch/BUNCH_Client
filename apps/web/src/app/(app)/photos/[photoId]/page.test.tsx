import { describe, expect, it, vi } from 'vitest';
import PhotoDetailPage, { metadata } from './page';

vi.mock('@/features/photo-box/components', () => ({ PhotoDetail: () => null }));

const render = async (photoId: string) => {
  const element = await PhotoDetailPage({ params: Promise.resolve({ photoId }) });
  return element.props as { photoId: string | undefined };
};

describe('/photos/[photoId] page', () => {
  it('형식이 맞는 id는 그대로 화면에 넘긴다', async () => {
    expect((await render('photo-12')).photoId).toBe('photo-12');
  });

  it('형식이 틀린 id는 undefined로 바꿔 넘긴다', async () => {
    expect((await render('../secret')).photoId).toBeUndefined();
    expect((await render('x'.repeat(65))).photoId).toBeUndefined();
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
