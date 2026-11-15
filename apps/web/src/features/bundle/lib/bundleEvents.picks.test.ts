import { describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { applyContentEvent } from './bundleEvents';

const mine = { version: 4, pickedByMe: true, memberIds: ['5'] };

// 이 테스트가 보는 필드(revision·사진·추천 날짜)만 채운 상세
const detail = {
  revision: 3,
  dateChips: [],
  photos: [
    { id: '1', sourcePhotoId: '101', src: '/a.jpg', position: 0, addedBy: '9', picks: mine },
  ],
} as unknown as BundleDetail;

const eventPhoto = (id: number, picks?: unknown) => ({
  id,
  imageAssetId: id,
  imageUrl: `/${id}.jpg`,
  position: id,
  addedBy: 9,
  addedAt: '2026-11-16T00:00:00Z',
  ...(picks === undefined ? {} : { picks }),
});

describe('PHOTOS 이벤트의 픽', () => {
  it('방송 이벤트에 실린 픽은 쓰지 않고 내 기존 픽(버전 포함)을 유지한다', () => {
    const broadcast = { count: 0, pickedByMe: false, version: 0, members: [] };

    const outcome = applyContentEvent(
      detail,
      'PHOTOS',
      { photos: [eventPhoto(1, broadcast)], dateChips: [] },
      4,
    );

    expect(outcome.kind).toBe('apply');
    if (outcome.kind === 'apply') expect(outcome.detail.photos[0]?.picks).toEqual(mine);
  });

  it('이벤트로 새로 들어온 사진은 픽 없이 시작한다', () => {
    const outcome = applyContentEvent(
      detail,
      'PHOTOS',
      { photos: [eventPhoto(1), eventPhoto(2)], dateChips: [] },
      4,
    );

    expect(outcome.kind).toBe('apply');
    if (outcome.kind === 'apply') {
      expect(outcome.detail.photos.map((photo) => photo.picks)).toEqual([mine, undefined]);
    }
  });
});
