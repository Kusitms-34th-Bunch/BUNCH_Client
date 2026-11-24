import { describe, expect, it } from 'vitest';
import type { PhotoBoxPhoto, PhotoBoxViewer } from './types';
import {
  canDeletePhotos,
  countCoUploaded,
  getDateConfirmKind,
  getDeleteKind,
  needsDateChangeConfirm,
  removesDraftBundlePhoto,
} from './photoActions';

const photo = (id: string, uploaderIds: string[]): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: id,
  takenAt: '2026-09-27T10:00',
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds,
  usedInDraftBundle: false,
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

  it('다른 멤버가 올린 사진만 고르면 others', () => {
    expect(getDeleteKind([photo('1', ['you'])], admin)).toBe('others');
    expect(getDeleteKind([photo('1', ['you']), photo('2', ['you', 'they'])], admin)).toBe('others');
  });

  it('내 사진과 다른 멤버 사진을 함께 고르면 others-included', () => {
    expect(getDeleteKind([photo('1', ['me']), photo('2', ['you'])], admin)).toBe('others-included');
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

describe('getDateConfirmKind', () => {
  it('다른 멤버가 올린 사진만 고르면 others', () => {
    expect(getDateConfirmKind([photo('1', ['you']), photo('2', ['you', 'they'])], admin)).toBe(
      'others',
    );
  });

  it('내 사진이 섞였거나 내가 함께 올린 사진이 있으면 included', () => {
    expect(getDateConfirmKind([photo('1', ['me']), photo('2', ['you'])], admin)).toBe('included');
    expect(getDateConfirmKind([photo('1', ['me', 'you'])], admin)).toBe('included');
  });
});

describe('removesDraftBundlePhoto', () => {
  const used = (id: string, uploaderIds: string[]): PhotoBoxPhoto => ({
    ...photo(id, uploaderIds),
    usedInDraftBundle: true,
  });

  it('사라지는 사진 중 작성 중인 번들에 쓰인 사진이 있으면 true', () => {
    expect(removesDraftBundlePhoto([photo('1', ['me']), used('2', ['me'])], member)).toBe(true);
  });

  it('번들에 쓰인 사진이 없으면 false', () => {
    expect(removesDraftBundlePhoto([photo('1', ['me'])], member)).toBe(false);
  });

  it('함께 올린 사진에서 내 이름만 빠지면 번들에 영향이 없어 false', () => {
    expect(removesDraftBundlePhoto([used('1', ['me', 'you'])], member)).toBe(false);
  });

  it('관리자가 남의 사진을 지우면 함께 올린 사진도 통째로 사라져 true', () => {
    expect(removesDraftBundlePhoto([used('1', ['you', 'they'])], admin)).toBe(true);
  });
});

describe('countCoUploaded', () => {
  it('올린 멤버가 둘 이상인 사진만 센다', () => {
    expect(
      countCoUploaded([photo('1', ['me']), photo('2', ['me', 'you']), photo('3', ['you', 'they'])]),
    ).toBe(2);
  });
});
