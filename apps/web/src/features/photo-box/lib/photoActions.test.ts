import { describe, expect, it } from 'vitest';
import type { PhotoBoxPhoto, PhotoBoxViewer } from './types';
import {
  applyDelete,
  applyTakenDate,
  canDeletePhotos,
  getDeleteKind,
  needsDateChangeConfirm,
} from './photoActions';

const photo = (id: string, uploaderIds: string[]): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt: '2026-09-27T10:00',
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds,
  status: 'ready',
});

const member: PhotoBoxViewer = { memberId: 'me', isAdmin: false };
const admin: PhotoBoxViewer = { memberId: 'me', isAdmin: true };

describe('canDeletePhotos', () => {
  it('일반 멤버는 내가 올린 사진(함께 올린 사진 포함)만 지울 수 있다', () => {
    expect(canDeletePhotos([photo('1', ['me']), photo('2', ['me', 'you'])], member)).toBe(true);
    expect(canDeletePhotos([photo('1', ['me']), photo('2', ['you'])], member)).toBe(false);
  });

  it('관리자는 다른 멤버 사진도 지울 수 있다', () => {
    expect(canDeletePhotos([photo('1', ['you'])], admin)).toBe(true);
  });
});

describe('getDeleteKind', () => {
  it('혼자 올린 내 사진만이면 own', () => {
    expect(getDeleteKind([photo('1', ['me']), photo('2', ['me'])], member)).toBe('own');
  });

  it('함께 올린 사진만이면 co-uploaded', () => {
    expect(getDeleteKind([photo('1', ['me', 'you'])], member)).toBe('co-uploaded');
  });

  it('혼자 올린 사진과 함께 올린 사진이 섞이면 mixed', () => {
    expect(getDeleteKind([photo('1', ['me']), photo('2', ['me', 'you'])], member)).toBe('mixed');
  });

  it('내가 올리지 않은 사진이 하나라도 있으면 others', () => {
    expect(getDeleteKind([photo('1', ['you'])], admin)).toBe('others');
    expect(getDeleteKind([photo('1', ['me']), photo('2', ['you'])], admin)).toBe('others');
  });
});

describe('applyDelete', () => {
  it('내 사진은 사라지고 사라진 장수를 센다', () => {
    const result = applyDelete([photo('1', ['me']), photo('2', ['me'])], new Set(['1']), member);

    expect(result.photos.map((p) => p.id)).toEqual(['2']);
    expect(result.removedCount).toBe(1);
  });

  it('함께 올린 사진은 내 이름만 빠지고 목록에는 남으며 사라진 장수에 세지 않는다', () => {
    const result = applyDelete([photo('1', ['me', 'you'])], new Set(['1']), member);

    expect(result.photos).toHaveLength(1);
    expect(result.photos[0]?.uploaderIds).toEqual(['you']);
    expect(result.removedCount).toBe(0);
  });

  it('관리자가 다른 멤버 사진을 지우면 사라진다', () => {
    const result = applyDelete([photo('1', ['you'])], new Set(['1']), admin);

    expect(result.photos).toEqual([]);
    expect(result.removedCount).toBe(1);
  });

  it('고르지 않은 사진은 그대로 두고 원본 목록을 바꾸지 않는다', () => {
    const original = [photo('1', ['me']), photo('2', ['you'])];
    const result = applyDelete(original, new Set(['1']), member);

    expect(result.photos.map((p) => p.id)).toEqual(['2']);
    expect(original).toHaveLength(2);
  });
});

describe('applyTakenDate', () => {
  const dated = (id: string, takenAt: string | null): PhotoBoxPhoto => ({
    ...photo(id, ['me']),
    takenAt,
  });

  it('고른 사진의 날짜만 바꾸고 시각은 그대로 둔다', () => {
    const result = applyTakenDate(
      [dated('1', '2026-09-27T14:30'), dated('2', '2026-09-26T09:05')],
      new Set(['1']),
      new Date(2026, 7, 5),
    );

    expect(result.map((p) => p.takenAt)).toEqual(['2026-08-05T14:30', '2026-09-26T09:05']);
  });

  it('촬영 날짜가 없던 사진은 그날 00:00으로 정한다', () => {
    const result = applyTakenDate([dated('1', null)], new Set(['1']), new Date(2026, 0, 3));

    expect(result[0]?.takenAt).toBe('2026-01-03T00:00');
  });

  it('원본 목록과 고르지 않은 사진 객체를 바꾸지 않는다', () => {
    const original = [dated('1', '2026-09-27T14:30'), dated('2', '2026-09-26T09:05')];
    const result = applyTakenDate(original, new Set(['1']), new Date(2026, 7, 5));

    expect(original[0]?.takenAt).toBe('2026-09-27T14:30');
    expect(result[1]).toBe(original[1]);
  });
});

describe('needsDateChangeConfirm', () => {
  const admin: PhotoBoxViewer = { memberId: 'me', isAdmin: true };
  const member: PhotoBoxViewer = { memberId: 'me', isAdmin: false };

  it('관리자가 다른 멤버 사진이나 함께 올린 사진을 포함하면 확인을 거친다', () => {
    expect(needsDateChangeConfirm([photo('1', ['me']), photo('2', ['you'])], admin)).toBe(true);
    expect(needsDateChangeConfirm([photo('1', ['me', 'you'])], admin)).toBe(true);
  });

  it('내가 혼자 올린 사진만이면 관리자도 확인 없이 바꾼다', () => {
    expect(needsDateChangeConfirm([photo('1', ['me']), photo('2', ['me'])], admin)).toBe(false);
  });

  it('일반 멤버는 확인을 거치지 않는다', () => {
    expect(needsDateChangeConfirm([photo('1', ['me', 'you'])], member)).toBe(false);
  });
});
