import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createSeed,
  MOCK_BUNCH_ID,
  MOCK_MEMBER_IDS,
  MOCK_MY_MEMBER_ID,
  MOCK_PHOTO_IDS,
} from './seed';

const { admin, memberA, memberB, memberC, me } = MOCK_MEMBER_IDS;

// 기대값은 UT 시나리오 문서의 사전 세팅(3-1, 3-2, 3-6)에서 가져옴
describe('UT 시나리오 시드', () => {
  it('시연 번치는 비공개 「여행쥬아」이고 소개가 있다', () => {
    expect(createSeed().bunches.filter((bunch) => bunch.id === MOCK_BUNCH_ID)).toEqual([
      expect.objectContaining({
        id: MOCK_BUNCH_ID,
        name: '여행쥬아',
        introduction: '여행 안 갈 바엔 죽을란다',
        isPrivate: true,
      }),
    ]);
  });

  it('멤버는 5명이고 시연하는 사람은 관리자가 아닌 일반 멤버다', () => {
    const { members, memberships } = createSeed();
    expect(members.map((member) => member.nickname)).toEqual([
      '지예',
      '경진',
      '은우',
      '수인',
      '큐시즘',
    ]);
    const bunchMemberships = memberships.filter(
      (membership) => membership.bunchId === MOCK_BUNCH_ID,
    );
    const roleOf = (memberId: number) =>
      bunchMemberships.find((membership) => membership.memberId === memberId)?.role;
    expect(MOCK_MY_MEMBER_ID).toBe(me);
    expect(roleOf(me)).toBe('MEMBER');
    expect(roleOf(admin)).toBe('OWNER');
    expect(bunchMemberships.filter((membership) => membership.role !== 'MEMBER')).toHaveLength(1);
  });

  it('사진은 13장이고 날짜 그룹은 10월 18일 6장, 17일 4장, 3일 3장이다', () => {
    const { photos } = createSeed();
    const countOn = (date: string) => photos.filter((photo) => photo.capturedDate === date).length;
    expect(photos).toHaveLength(13);
    expect([countOn('2026-10-18'), countOn('2026-10-17'), countOn('2026-10-03')]).toEqual([
      6, 4, 3,
    ]);
  });

  it('지정 날짜(10월 17일)는 4장이고 그중 멤버 B가 올린 사진이 2장이다', () => {
    const designated = createSeed().photos.filter((photo) => photo.capturedDate === '2026-10-17');
    expect(designated.map((photo) => photo.photoId)).toEqual([
      MOCK_PHOTO_IDS.P1,
      MOCK_PHOTO_IDS.P2,
      MOCK_PHOTO_IDS.P3,
      MOCK_PHOTO_IDS.P4,
    ]);
    const byMemberB = designated.filter((photo) => photo.uploaderIds.includes(memberB));
    expect(byMemberB.map((photo) => photo.photoId)).toEqual([MOCK_PHOTO_IDS.P2, MOCK_PHOTO_IDS.P4]);
  });

  it('올린 사람이 시나리오의 사진 표와 같다', () => {
    const uploaders = Object.fromEntries(
      createSeed().photos.map((photo) => [photo.photoId, photo.uploaderIds]),
    );
    const expected = {
      S1: [admin],
      S2: [memberA],
      S3: [memberB],
      S4: [me],
      S5: [memberA],
      S6: [memberC],
      P1: [memberA],
      P2: [memberB],
      P3: [me],
      P4: [memberB],
      O1: [admin],
      O2: [memberC],
      O3: [memberA],
    };
    for (const [label, uploaderIds] of Object.entries(expected)) {
      expect(uploaders[MOCK_PHOTO_IDS[label as keyof typeof MOCK_PHOTO_IDS]]).toEqual(uploaderIds);
    }
  });

  it('날짜를 모르는 사진은 없고 같은 날짜 안에서 촬영 시각이 모두 다르다', () => {
    const { photos } = createSeed();
    expect(photos.every((photo) => photo.capturedDate !== null)).toBe(true);
    const keys = photos.map((photo) => `${photo.capturedDate}T${photo.capturedTime}`);
    expect(new Set(keys).size).toBe(photos.length);
  });

  it('사진마다 썸네일과 원본 주소가 있고 서로 다르다', () => {
    const { photos } = createSeed();
    expect(new Set(photos.map((photo) => photo.thumbnailUrl)).size).toBe(photos.length);
    expect(photos.every((photo) => photo.imageUrl !== photo.thumbnailUrl)).toBe(true);
  });

  it('썸네일과 원본 주소가 모두 public 폴더의 실제 파일을 가리킨다', () => {
    const publicDir = join(process.cwd(), 'public');
    for (const { thumbnailUrl, imageUrl } of createSeed().photos) {
      expect(existsSync(join(publicDir, thumbnailUrl)), thumbnailUrl).toBe(true);
      expect(existsSync(join(publicDir, imageUrl)), imageUrl).toBe(true);
    }
  });
});
