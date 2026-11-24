import { ApiError } from '@app/api-core';
import { describe, expect, it } from 'vitest';
import type { BunchSummary } from '../lib/types';
import { accessNoticeIdOf } from './bunchAccessNotice';
import {
  publishedBundlesPageSchema,
  toBunchHomeDetail,
  toBunchSummaries,
  type Home,
} from './bunchHome';

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
    // 모르는 값은 응답을 읽을 때 비워 목록 전체가 실패하지 않음
    const published = publishedBundlesPageSchema.parse({
      ...empty,
      items: [item(1, 'PRIVATE'), item(2, 'PUBLIC'), item(3), item(4, 'FOLLOWERS')],
    });
    const detail = toBunchHomeDetail(home(), published, { items: [] }, []);

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

describe('accessNoticeIdOf', () => {
  const apiError = (code: string, detail: unknown) =>
    new ApiError({
      message: code,
      category: 'validation',
      status: 409,
      code,
      data: { success: false, data: null, error: { code, message: 'x', detail } },
    });

  it('409 BUNCH_008이면 서버 안내 ID를 화면 id로 준다', () => {
    expect(accessNoticeIdOf(apiError('BUNCH_008', { noticeId: 7, reason: 'REMOVED' }))).toBe('7');
  });

  it('다른 오류이거나 안내 ID가 없으면 undefined', () => {
    expect(accessNoticeIdOf(apiError('BUNCH_009', null))).toBeUndefined();
    expect(accessNoticeIdOf(apiError('BUNCH_008', null))).toBeUndefined();
    expect(accessNoticeIdOf(new Error('x'))).toBeUndefined();
    expect(accessNoticeIdOf(null)).toBeUndefined();
  });
});

describe('toBunchSummaries', () => {
  const current: BunchSummary = { id: '9', name: '테스트용', alertCount: 0, access: 'active' };
  const active = (id: number, name: string, lastUsedAt: string) => ({
    bunch: { id, name, characterType: 'TYPE_1' as const },
    unreadCount: 0,
    lastUsedAt,
  });
  const list = (activeBunches: ReturnType<typeof active>[]) => ({
    activeCount: activeBunches.length,
    maxActiveCount: 10,
    activeBunches,
    unavailableBunches: [],
  });

  it('지금 번치를 맨 위에, 나머지는 최근 사용순으로 둔다', () => {
    const result = toBunchSummaries(
      list([
        active(1, '오래된', '2026-11-01T00:00:00Z'),
        active(9, '테스트용', '2026-11-02T00:00:00Z'),
        active(2, '최근', '2026-11-03T00:00:00Z'),
      ]),
      current,
    );
    expect(result.map((bunch) => bunch.name)).toEqual(['테스트용', '최근', '오래된']);
  });

  it('목록이 낡아 지금 번치가 없어도(다른 탭에서 만든 번치) 지금 번치를 맨 위에 보인다', () => {
    expect(toBunchSummaries(list([]), current)).toEqual([current]);
    expect(
      toBunchSummaries(list([active(1, '퇴근런클럽', '2026-11-01T00:00:00Z')]), current).map(
        (bunch) => bunch.name,
      ),
    ).toEqual(['테스트용', '퇴근런클럽']);
  });

  it('목록을 못 받았으면 지금 번치 하나만 보인다', () => {
    expect(toBunchSummaries(undefined, current)).toEqual([current]);
  });
});
