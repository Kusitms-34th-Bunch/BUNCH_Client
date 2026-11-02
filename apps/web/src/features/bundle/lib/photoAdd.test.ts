import { describe, expect, it } from 'vitest';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { draftFixture } from '../fixtures/draft.fixture';
import {
  applySelection,
  countUnlinked,
  getInitialSelection,
  getMaxSelectable,
  getRemovedPhotos,
  isSameSelection,
  isSourceLocked,
  toDraftPhoto,
  toDraftPhotoId,
} from './photoAdd';
import type { Draft, DraftPhoto } from './types';

const draftPhoto = (id: string, sourcePhotoId?: string, caption = ''): DraftPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  caption,
  takenAt: null,
  uploaderId: 'jiye',
  sourcePhotoId,
});

const source = (id: string, uploaderIds = ['gyeongjin']): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: `${id} 사진`,
  takenAt: '2026-09-27T14:10',
  uploadedAt: '2026-10-29T09:01:00',
  uploaderIds,
  status: 'ready',
});

const photos = [
  draftPhoto('draft-a', 'a', '가 캡션'),
  draftPhoto('draft-b', 'b'),
  draftPhoto('gallery-1'),
];

describe('toDraftPhoto', () => {
  it('사진함 사진을 캡션 없는 번들 사진으로 바꾸고 올린 멤버는 첫 번째로 한다', () => {
    expect(toDraftPhoto(source('c', ['suin', 'eunwoo']))).toEqual({
      id: 'draft-c',
      src: '/c.jpg',
      alt: 'c 사진',
      caption: '',
      takenAt: '2026-09-27T14:10',
      uploaderId: 'suin',
      sourcePhotoId: 'c',
    });
  });

  it('같은 사진은 언제나 같은 번들 사진 id가 된다', () => {
    expect(toDraftPhotoId('photo-7')).toBe('draft-photo-7');
    expect(toDraftPhoto(source('photo-7')).id).toBe(toDraftPhotoId('photo-7'));
  });

  it('초안 fixture의 번들 사진 id가 사진함 사진 id와 이 규칙으로 맞는다', () => {
    for (const photo of draftFixture.photos) {
      expect(photo.sourcePhotoId).toBeDefined();
      expect(toDraftPhotoId(photo.sourcePhotoId!)).toBe(photo.id);
    }
  });
});

describe('getInitialSelection·한도', () => {
  it('번들 순서대로 사진함 사진 id를 담고 대응이 없는 사진은 뺀다', () => {
    expect(getInitialSelection(photos)).toEqual(['a', 'b']);
  });

  it('대응이 없는 사진도 20장 한도에 들어 고를 수 있는 장수가 줄어든다', () => {
    expect(countUnlinked(photos)).toBe(1);
    expect(getMaxSelectable(photos)).toBe(19);
    expect(getMaxSelectable([])).toBe(20);
  });
});

describe('isSameSelection', () => {
  it('길이와 번호(순서)까지 같아야 같다', () => {
    expect(isSameSelection(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(isSameSelection(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(isSameSelection(['a', 'b'], ['a'])).toBe(false);
    expect(isSameSelection(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });
});

describe('getRemovedPhotos', () => {
  it('선택에서 풀린 사진만 돌려주고 대응이 없는 사진은 포함하지 않는다', () => {
    expect(getRemovedPhotos(photos, ['b']).map((photo) => photo.id)).toEqual(['draft-a']);
    expect(getRemovedPhotos(photos, ['a', 'b'])).toEqual([]);
  });
});

describe('applySelection', () => {
  const sources = [source('a'), source('b'), source('c'), source('d')];

  it('이미 있던 사진은 캡션을 지키고 새로 고른 사진은 캡션 없이 뒤에 붙인다', () => {
    const next = applySelection(photos, ['a', 'b', 'c'], sources);

    expect(next.map((photo) => photo.id)).toEqual(['draft-a', 'draft-b', 'draft-c', 'gallery-1']);
    expect(next[0]?.caption).toBe('가 캡션');
    expect(next[2]?.caption).toBe('');
  });

  it('푼 사진은 캡션과 함께 빠진다', () => {
    const next = applySelection(photos, ['b'], sources);

    expect(next.map((photo) => photo.id)).toEqual(['draft-b', 'gallery-1']);
  });

  it('선택 순서가 번들 순서가 되고 푼 뒤 다시 고른 사진도 캡션을 지킨다', () => {
    const next = applySelection(photos, ['b', 'a'], sources);

    expect(next.map((photo) => photo.id)).toEqual(['draft-b', 'draft-a', 'gallery-1']);
    expect(next[1]?.caption).toBe('가 캡션');
  });

  it('사진함에 더는 없는 사진 id는 건너뛴다', () => {
    const next = applySelection(photos, ['a', 'gone'], sources);

    expect(next.map((photo) => photo.id)).toEqual(['draft-a', 'gallery-1']);
  });
});

describe('isSourceLocked', () => {
  const draft: Draft = {
    ...draftFixture,
    photos: [draftPhoto('draft-a', 'a'), draftPhoto('draft-b', 'b')],
    editing: { photoEditors: { 'draft-a': ['gyeongjin'], 'draft-b': ['jiye'] } },
  };
  const viewer = { memberId: 'jiye', bunchRole: 'owner' as const };

  it('다른 멤버가 편집 중인 사진만 잠겨 있다(내가 편집 중인 것은 제외)', () => {
    expect(isSourceLocked(draft, viewer, 'a')).toBe(true);
    expect(isSourceLocked(draft, viewer, 'b')).toBe(false);
  });

  it('번들에 없는 사진은 잠겨 있지 않다', () => {
    expect(isSourceLocked(draft, viewer, 'zzz')).toBe(false);
  });
});
