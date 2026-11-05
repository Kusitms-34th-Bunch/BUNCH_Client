import { describe, expect, it } from 'vitest';
import type { PhotoSection } from './photoDate';
import type { PhotoBoxPhoto, PhotoBoxViewer } from './types';
import {
  canDragPhoto,
  dateFromKey,
  findSectionKey,
  moveItem,
  needsDragConfirm,
  toSectionItems,
} from './photoDrag';

const photo = (
  id: string,
  uploaderIds: string[] = ['me'],
  status: PhotoBoxPhoto['status'] = 'ready',
): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt: '2026-09-27T10:00',
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds,
  status,
});

const me: PhotoBoxViewer = { memberId: 'me', isAdmin: false };
const admin: PhotoBoxViewer = { memberId: 'me', isAdmin: true };

describe('canDragPhoto', () => {
  it('내가 올린 사진과 함께 올린 사진은 끌 수 있다', () => {
    expect(canDragPhoto(photo('1'), me)).toBe(true);
    expect(canDragPhoto(photo('1', ['me', 'you']), me)).toBe(true);
  });

  it('다른 멤버 사진은 일반 멤버가 끌 수 없고 관리자는 끌 수 있다', () => {
    expect(canDragPhoto(photo('1', ['you']), me)).toBe(false);
    expect(canDragPhoto(photo('1', ['you']), admin)).toBe(true);
  });

  it('처리 중이거나 불러오지 못한 사진은 끌 수 없다', () => {
    expect(canDragPhoto(photo('1', ['me'], 'processing'), admin)).toBe(false);
    expect(canDragPhoto(photo('1', ['me'], 'failed'), me)).toBe(false);
  });
});

describe('needsDragConfirm', () => {
  it('관리자가 다른 멤버 사진이나 함께 올린 사진을 끌 때만 확인을 거친다', () => {
    expect(needsDragConfirm(photo('1', ['you']), admin)).toBe(true);
    expect(needsDragConfirm(photo('1', ['me', 'you']), admin)).toBe(true);
    expect(needsDragConfirm(photo('1', ['me']), admin)).toBe(false);
  });

  it('일반 멤버는 확인을 거치지 않는다', () => {
    expect(needsDragConfirm(photo('1', ['me', 'you']), me)).toBe(false);
  });
});

describe('moveItem', () => {
  const sections: PhotoSection[] = [
    { dateKey: '2026-09-28', label: '9월 28일', photos: [photo('a'), photo('b'), photo('c')] },
    { dateKey: '2026-09-27', label: '9월 27일', photos: [photo('d'), photo('e')] },
  ];
  const items = toSectionItems(sections);

  it('섹션별 사진 id 순서를 뽑고 사진이 있는 섹션을 찾는다', () => {
    expect(items).toEqual({ '2026-09-28': ['a', 'b', 'c'], '2026-09-27': ['d', 'e'] });
    expect(findSectionKey(items, 'e')).toBe('2026-09-27');
    expect(findSectionKey(items, 'zzz')).toBeUndefined();
  });

  it('다른 섹션의 놓을 자리로 옮기면 원래 섹션에서 빠지고 그 자리에 들어간다', () => {
    expect(moveItem(items, 'b', '2026-09-27', 1)).toEqual({
      '2026-09-28': ['a', 'c'],
      '2026-09-27': ['d', 'b', 'e'],
    });
  });

  it('자리가 범위를 벗어나면 처음이나 끝으로 맞춘다', () => {
    expect(moveItem(items, 'a', '2026-09-27', 99)['2026-09-27']).toEqual(['d', 'e', 'a']);
    expect(moveItem(items, 'a', '2026-09-27', -3)['2026-09-27']).toEqual(['a', 'd', 'e']);
  });

  it('같은 섹션 안에서는 자리만 바꾸고 이미 그 자리면 같은 객체를 돌려준다', () => {
    expect(moveItem(items, 'a', '2026-09-28', 2)['2026-09-28']).toEqual(['b', 'c', 'a']);
    expect(moveItem(items, 'a', '2026-09-28', 0)).toBe(items);
  });

  it('없는 섹션이나 없는 사진이면 그대로 둔다', () => {
    expect(moveItem(items, 'a', '2020-01-01', 0)).toBe(items);
    expect(moveItem(items, 'zzz', '2026-09-27', 0)).toBe(items);
  });

  it('원본 순서를 바꾸지 않는다', () => {
    moveItem(items, 'b', '2026-09-27', 0);

    expect(items['2026-09-28']).toEqual(['a', 'b', 'c']);
  });
});

describe('dateFromKey', () => {
  it('섹션 키를 기기 시간대의 그날 0시로 바꾼다', () => {
    const date = dateFromKey('2026-09-27');

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 8, 27, 0,
    ]);
  });
});
