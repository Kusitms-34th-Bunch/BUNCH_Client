import { describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { applyContentEvent, keepNewerPicks } from './bundleEvents';

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

describe('keepNewerPicks', () => {
  const withPicks = (picks: BundleDetail['photos'][number]['picks']) =>
    ({ ...detail, photos: [{ ...detail.photos[0]!, picks }] }) as unknown as BundleDetail;

  it('내 픽 버전이 뒤로 가는 상세는 그 사진의 픽을 되돌리지 못한다', () => {
    const saved = withPicks(mine);
    const stale = withPicks({ version: 0, pickedByMe: false, memberIds: [] });

    expect(keepNewerPicks(saved, stale).photos[0]?.picks).toEqual(mine);
  });

  it('픽이 없는 상세도 낡은 것으로 보고 저장된 픽을 지키며, 다른 필드는 들어온 값을 쓴다', () => {
    const saved = withPicks(mine);
    const stale = { ...withPicks(undefined), title: '새 제목' };

    const merged = keepNewerPicks(saved, stale);

    expect(merged.photos[0]?.picks).toEqual(mine);
    expect(merged.title).toBe('새 제목');
  });

  it('같거나 더 새 버전이면 들어온 값(다른 멤버의 픽 포함)을 쓴다', () => {
    const saved = withPicks(mine);
    const sameVersion = withPicks({ ...mine, memberIds: ['5', '6'] });
    const newer = withPicks({ version: 9, pickedByMe: false, memberIds: [] });

    expect(keepNewerPicks(saved, sameVersion)).toBe(sameVersion);
    expect(keepNewerPicks(saved, newer)).toBe(newer);
  });
});
