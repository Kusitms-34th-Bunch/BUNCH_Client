import { describe, expect, it } from 'vitest';
import type { Draft, DraftPhoto, DraftViewer } from './types';
import { draftFixture } from '../fixtures/draft.fixture';
import {
  clampCaption,
  getPhotoEditors,
  getRemovePhotoKind,
  movePhoto,
  planPhotoMoves,
  removePhoto,
  setPhotoCaption,
} from './photos';

const photo = (id: string, caption = ''): DraftPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  caption,
  takenAt: null,
  uploaderId: 'jiye',
});

const photos = [photo('a', '가'), photo('b'), photo('c', '다')];

describe('clampCaption', () => {
  it('200자 이하는 그대로 둔다', () => {
    expect(clampCaption('가'.repeat(200))).toEqual({ text: '가'.repeat(200), exceeded: false });
  });

  it('200자를 넘으면 앞 200자만 남기고 넘쳤다고 알린다', () => {
    expect(clampCaption('가'.repeat(230))).toEqual({ text: '가'.repeat(200), exceeded: true });
  });

  it('이모지는 한 글자로 세어 쪼개지 않는다', () => {
    const result = clampCaption('😀'.repeat(201));
    expect(result.exceeded).toBe(true);
    expect(Array.from(result.text)).toHaveLength(200);
  });
});

describe('getRemovePhotoKind', () => {
  it('1장이면 막는다', () => {
    expect(getRemovePhotoKind([photo('a', '가')])).toBe('last');
  });

  it('2장 이상이면 캡션이 있든 없든 항상 확인을 거친다', () => {
    expect(getRemovePhotoKind(photos)).toBe('confirm');
    expect(getRemovePhotoKind([photo('a'), photo('b', '   ')])).toBe('confirm');
  });
});

describe('setPhotoCaption', () => {
  it('그 사진의 캡션만 바꾼다', () => {
    const next = setPhotoCaption(photos, 'b', '새 캡션');
    expect(next.map((item) => item.caption)).toEqual(['가', '새 캡션', '다']);
  });
});

describe('removePhoto', () => {
  it('사진을 빼고 나머지 순서를 지킨다', () => {
    expect(removePhoto(photos, 'b').map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('1장이면 빼지 않는다', () => {
    const only = [photo('a')];
    expect(removePhoto(only, 'a')).toBe(only);
  });
});

describe('movePhoto', () => {
  it('뒤로 옮기고 캡션이 사진을 따라간다', () => {
    const next = movePhoto(photos, 'a', 2);
    expect(next.map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(next[2]?.caption).toBe('가');
  });

  it('앞으로 옮기면 맨 앞 사진이 바뀐다', () => {
    expect(movePhoto(photos, 'c', 0).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('범위를 벗어난 자리는 끝으로 맞춘다', () => {
    expect(movePhoto(photos, 'a', 99).map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(movePhoto(photos, 'c', -5).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('같은 자리이거나 없는 사진이면 그대로 둔다', () => {
    expect(movePhoto(photos, 'b', 1)).toBe(photos);
    expect(movePhoto(photos, 'x', 0)).toBe(photos);
  });
});

describe('getPhotoEditors', () => {
  const viewer: DraftViewer = { memberId: 'jiye', bunchRole: 'owner' };
  const draft: Draft = {
    ...draftFixture,
    editing: { photoEditors: { a: ['gyeongjin', 'jiye'] } },
  };

  it('내가 아닌 편집 중인 멤버만 돌려준다', () => {
    expect(getPhotoEditors(draft, viewer, 'a')).toEqual(['gyeongjin']);
  });

  it('편집 중인 멤버가 없으면 빈 목록이다', () => {
    expect(getPhotoEditors(draft, viewer, 'b')).toEqual([]);
  });
});

describe('planPhotoMoves', () => {
  it('이미 같은 순서면 이동이 없다', () => {
    expect(planPhotoMoves(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([]);
  });

  it('앞선 이동을 반영한 앞뒤 사진으로 이동을 만든다', () => {
    expect(planPhotoMoves(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      { photoId: 'c', previous: null, next: 'a' },
    ]);
    expect(planPhotoMoves(['a', 'b', 'c'], ['c', 'b', 'a'])).toEqual([
      { photoId: 'c', previous: null, next: 'a' },
      { photoId: 'b', previous: 'c', next: 'a' },
    ]);
  });

  it('원하는 순서에 없는 사진은 뒤에 그대로 두고 모르는 사진은 건너뛴다', () => {
    expect(planPhotoMoves(['a', 'b', 'c'], ['b', 'x', 'a'])).toEqual([
      { photoId: 'b', previous: null, next: 'a' },
    ]);
  });
});
