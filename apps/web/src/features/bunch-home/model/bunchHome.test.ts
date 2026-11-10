import { describe, expect, it } from 'vitest';
import { publishedBundlesPageSchema, toBunchHomeDetail, type Home } from './bunchHome';

const home = (bunch: Partial<Home['bunch']> = {}): Home => ({
  bunch: { id: 1, name: '퇴근런클럽', characterType: 'TYPE_2', visibility: 'PUBLIC', ...bunch },
  myMembership: { membershipId: 1, role: 'OWNER', joinedAt: '2026-11-07T00:00:00Z' },
  permissions: {
    canEditProfile: true,
    canDeleteBunch: true,
    canManageRoles: true,
    canTransferOwner: true,
    canBlock: true,
    canInvite: true,
    canLeave: true,
  },
  memberCount: 1,
  followerCount: 0,
  followingCount: 0,
  stage: 0,
});
const empty = { items: [], page: 0, size: 20, totalElements: 0, hasNext: false };
const detail = (bunch?: Partial<Home['bunch']>) =>
  toBunchHomeDetail(home(bunch), empty, { items: [] }, []);

describe('toBunchHomeDetail', () => {
  it('공개 범위가 PRIVATE인 번들만 멤버 공개로 표시하고 값이 없거나 모르는 값이면 표시하지 않는다', () => {
    const item = (id: number, visibility?: string) => ({
      id,
      bunchId: 1,
      title: `번들 ${id}`,
      visibility,
    });
    const detail = toBunchHomeDetail(
      home(),
      { ...empty, items: [item(1, 'PRIVATE'), item(2, 'PUBLIC'), item(3), item(4, 'FOLLOWERS')] },
      { items: [] },
      [],
    );

    expect(detail?.completedBundles.map((bundle) => bundle.memberOnly)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(
      publishedBundlesPageSchema.safeParse({ ...empty, items: [item(4, 'FOLLOWERS')] }).success,
    ).toBe(true);
  });

  it('번치 성격을 그대로 넘기고 대표 이미지가 없으면 성격별 기본 이미지를 쓴다', () => {
    expect(detail()).toMatchObject({
      characterType: 'TYPE_2',
      imageSrc: '/images/default-bunch/type-2.svg',
    });
    expect(detail({ characterType: 'TYPE_3' })?.imageSrc).toBe('/images/default-bunch/type-3.svg');
    expect(detail({ characterType: 'TYPE_4' })?.imageSrc).toBe('/images/default-bunch/type-4.svg');
  });

  it('올린 대표 이미지가 있으면 성격과 상관없이 그 이미지를 쓴다', () => {
    expect(detail({ imageUrl: 'https://cdn.example.com/bunch.png' })?.imageSrc).toBe(
      'https://cdn.example.com/bunch.png',
    );
  });
});
