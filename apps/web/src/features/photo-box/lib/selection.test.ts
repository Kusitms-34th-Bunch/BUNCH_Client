import { describe, expect, it } from 'vitest';
import {
  MAX_SELECTION,
  countSelectedByMember,
  getSelectionOrder,
  pruneSelection,
  toggleSelection,
} from './selection';
import { ALL_MEMBERS, type PhotoBoxPhoto } from './types';

const photo = (id: string, uploaderIds: string[]): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt: '2026-09-27T10:00',
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds,
  status: 'ready',
});

describe('toggleSelection', () => {
  it('누른 순서대로 뒤에 추가한다', () => {
    const first = toggleSelection([], 'a');
    const second = toggleSelection(first.selection, 'b');

    expect(second.selection).toEqual(['a', 'b']);
    expect(second.rejected).toBe(false);
  });

  it('다시 누르면 해제하고 뒤 번호가 당겨진다', () => {
    const { selection } = toggleSelection(['a', 'b', 'c'], 'a');

    expect(selection).toEqual(['b', 'c']);
    expect(getSelectionOrder(selection, 'b')).toBe(1);
    expect(getSelectionOrder(selection, 'c')).toBe(2);
  });

  it('최대 장수에서 새 사진을 고르면 그대로 두고 거절한다', () => {
    const full = Array.from({ length: MAX_SELECTION }, (_, index) => `p${index}`);
    const result = toggleSelection(full, 'extra');

    expect(result.rejected).toBe(true);
    expect(result.selection).toBe(full);
  });

  it('최대 장수여도 이미 고른 사진은 해제할 수 있다', () => {
    const full = Array.from({ length: MAX_SELECTION }, (_, index) => `p${index}`);
    const result = toggleSelection(full, 'p10');

    expect(result.rejected).toBe(false);
    expect(result.selection).toHaveLength(MAX_SELECTION - 1);
  });

  it('원본 목록을 바꾸지 않는다', () => {
    const original = ['a'];
    toggleSelection(original, 'b');

    expect(original).toEqual(['a']);
  });
});

describe('getSelectionOrder', () => {
  it('고른 사진은 1부터의 번호, 아니면 undefined', () => {
    expect(getSelectionOrder(['a', 'b'], 'b')).toBe(2);
    expect(getSelectionOrder(['a', 'b'], 'z')).toBeUndefined();
  });
});

describe('pruneSelection', () => {
  it('목록에서 사라진 사진을 빼고 순서를 유지한다', () => {
    const result = pruneSelection(['a', 'b', 'c', 'd'], new Set(['a', 'c', 'd']));

    expect(result.selection).toEqual(['a', 'c', 'd']);
    expect(result.removedCount).toBe(1);
    expect(getSelectionOrder(result.selection, 'c')).toBe(2);
  });

  it('사라진 사진이 없으면 같은 선택이다', () => {
    const result = pruneSelection(['a', 'b'], new Set(['a', 'b', 'c']));

    expect(result.selection).toEqual(['a', 'b']);
    expect(result.removedCount).toBe(0);
  });
});

describe('countSelectedByMember', () => {
  const photos = [
    photo('1', ['eunwoo']),
    photo('2', ['gyeongjin']),
    photo('3', ['eunwoo', 'gyeongjin']),
    photo('4', ['suin']),
  ];

  it('전체는 고른 장수, 멤버는 그 멤버가 올린 사진 중 고른 장수다', () => {
    const counts = countSelectedByMember(['1', '2', '4'], photos);

    expect(counts[ALL_MEMBERS]).toBe(3);
    expect(counts['eunwoo']).toBe(1);
    expect(counts['gyeongjin']).toBe(1);
    expect(counts['suin']).toBe(1);
  });

  it('함께 올린 사진은 올린 멤버 모두에게 센다', () => {
    const counts = countSelectedByMember(['3'], photos);

    expect(counts[ALL_MEMBERS]).toBe(1);
    expect(counts['eunwoo']).toBe(1);
    expect(counts['gyeongjin']).toBe(1);
  });

  it('고른 사진이 없으면 전체는 0이고 멤버 항목은 없다', () => {
    const counts = countSelectedByMember([], photos);

    expect(counts[ALL_MEMBERS]).toBe(0);
    expect(counts['eunwoo']).toBeUndefined();
  });

  it('목록에 없는 id는 세지 않는다', () => {
    expect(countSelectedByMember(['ghost'], photos)[ALL_MEMBERS]).toBe(0);
  });
});
