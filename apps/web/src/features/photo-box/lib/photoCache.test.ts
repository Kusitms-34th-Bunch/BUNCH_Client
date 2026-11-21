import { describe, expect, it } from 'vitest';
import { withoutPhotos, withPhotosBack } from './photoCache';

const photo = (id: string, uploaderIds: string[] = ['me']) => ({ id, uploaderIds });
const pages = (...ids: string[][]) => ({
  pageParams: ids.map((_, index) => index),
  pages: ids.map((page) => ({ photos: page.map((id) => photo(id)), nextCursor: null })),
});
const idsIn = (data: unknown) =>
  (data as { pages: { photos: { id: string }[] }[] }).pages.map((page) =>
    page.photos.map((item) => item.id),
  );

describe('photoCache', () => {
  it('함께 올린 사진은 삭제해도 사진함에 남으므로 빼지 않는다', () => {
    const data = { pageParams: [0], pages: [{ photos: [photo('a'), photo('b', ['me', 'you'])] }] };

    const { data: next, removed } = withoutPhotos(data, new Set(['a', 'b']));

    expect(idsIn(next)).toEqual([['b']]);
    expect(removed.map((entry) => entry.photo.id)).toEqual(['a']);
  });

  it('겹친 두 삭제가 모두 실패하면 각자 뺀 사진을 원래 자리에 되돌린다', () => {
    const first = withoutPhotos(pages(['a', 'b', 'c'], ['d']), new Set(['a']));
    const second = withoutPhotos(first.data, new Set(['b', 'd']));

    const afterFirstFails = withPhotosBack(second.data, first.removed);
    expect(idsIn(afterFirstFails)).toEqual([['a', 'c'], []]);
    expect(idsIn(withPhotosBack(afterFirstFails, second.removed))).toEqual([
      ['a', 'b', 'c'],
      ['d'],
    ]);
  });

  it('한 삭제만 실패하면 다른 삭제가 뺀 사진은 그대로 둔다', () => {
    const first = withoutPhotos(pages(['a', 'b', 'c']), new Set(['a']));
    const second = withoutPhotos(first.data, new Set(['b']));

    expect(idsIn(withPhotosBack(second.data, second.removed))).toEqual([['b', 'c']]);
  });

  it('그 사이 다시 받아 이미 있는 사진은 다시 넣지 않는다', () => {
    const { removed } = withoutPhotos(pages(['a', 'b']), new Set(['a']));

    expect(idsIn(withPhotosBack(pages(['a', 'b']), removed))).toEqual([['a', 'b']]);
  });
});
