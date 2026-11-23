import { describe, expect, it } from 'vitest';
import type { Draft, DraftLocation, DraftPhoto } from './types';
import { applyOp, reconcileOverrides, sameLocations, toEditPhotos } from './bundleEdit';

const photo = (id: string, sourcePhotoId?: string): DraftPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: '',
  takenAt: null,
  uploaderId: 'a',
  sourcePhotoId,
});
const place = (externalId: string, id = externalId): DraftLocation => ({
  id,
  provider: 'kakao',
  externalId,
  name: externalId,
  address: null,
});
const draft = (patch: Partial<Draft>): Draft =>
  ({ title: '제목', date: null, photos: [], locations: [], ...patch }) as Draft;

describe('applyOp', () => {
  it('이 화면에서 더한 위치 줄은 new: 표시로 둔다', () => {
    const [added] = applyOp([], {
      no: 1,
      kind: 'add',
      place: { provider: 'kakao', externalId: 'x', name: 'x', address: null },
    });
    expect(added?.id.startsWith('new:')).toBe(true);
  });
});

describe('sameLocations', () => {
  it('줄 id가 달라도 장소 내용이 같으면 같다고 본다', () => {
    expect(sameLocations([place('a', '1')], [place('a', '2')])).toBe(true);
    expect(sameLocations([place('a')], [place('b')])).toBe(false);
  });
});

describe('reconcileOverrides', () => {
  it('서버에서 바뀐 필드의 편집만 버리고 나머지 편집은 남긴다', () => {
    const before = draft({ title: '옛 제목', date: '2026-10-01' });
    const after = draft({ title: '새 제목', date: '2026-10-01' });
    expect(reconcileOverrides({ title: '내 제목', date: '2026-10-02' }, before, after)).toEqual({
      date: '2026-10-02',
    });
  });
});

describe('toEditPhotos', () => {
  it('남긴 사진은 번들 사진 id, 새로 가져온 사진은 사진함 원본 id로 보낸다', () => {
    expect(toEditPhotos([photo('b1'), photo('new', 's9')], new Set(['b1']))).toEqual([
      { bundlePhotoId: 'b1' },
      { photoId: 's9' },
    ]);
  });

  it('보낼 id가 없는 사진이 있으면 undefined', () => {
    expect(toEditPhotos([photo('new')], new Set())).toBeUndefined();
  });
});
