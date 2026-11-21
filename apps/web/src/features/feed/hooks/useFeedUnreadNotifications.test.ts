import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MyBunches } from '@/shared/api/myBunches';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { useFeedUnreadNotifications } from './useFeedUnreadNotifications';

const activeBunch = (id: number, unreadCount: number) => ({
  bunch: { id, name: `번치 ${id}`, imageUrl: null, characterType: 'TYPE_1' as const },
  unreadCount,
  lastUsedAt: '2026-11-22T00:00:00Z',
});

const renderWith = (bunches: MyBunches['activeBunches'], bunchId: string | null) => {
  const client = createTestQueryClient();
  client.setQueryData<MyBunches>(sharedKeys.myBunches(), {
    activeCount: bunches.length,
    maxActiveCount: 5,
    activeBunches: bunches,
    unavailableBunches: [],
  });
  const viewer = bunchId === null ? null : { bunchId, name: '지금 번치' };
  return renderHook(() => useFeedUnreadNotifications(viewer), {
    wrapper: createQueryWrapper(client),
  });
};

describe('useFeedUnreadNotifications', () => {
  it('지금 번치의 읽지 않은 알림만 본다', () => {
    const bunches = [activeBunch(1, 0), activeBunch(2, 3)];
    expect(renderWith(bunches, '2').result.current).toBe(true);
    expect(renderWith(bunches, '1').result.current).toBe(false);
  });

  it('번치가 없거나 목록에 없으면 점 없음', () => {
    expect(renderWith([activeBunch(2, 3)], null).result.current).toBe(false);
    expect(renderWith([activeBunch(2, 3)], '9').result.current).toBe(false);
  });
});
