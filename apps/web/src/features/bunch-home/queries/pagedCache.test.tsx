import type { InfiniteData } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { BlockPage } from '../model/blocks';
import type { NotificationPage } from '../model/notifications';
import { useUnblockBunchMutation } from './blocks';
import { bunchHomeKeys } from './keys';
import { useReadAllNotificationsMutation } from './notifications';

const card = (id: number) => ({
  id,
  name: `번치${id}`,
  characterType: 'TYPE_1' as const,
  visibility: 'PUBLIC' as const,
});
const pages = <T,>(items: T[][]) => ({
  pages: items.map((page, index) => ({
    items: page,
    page: index,
    size: 1,
    totalElements: 3,
    hasNext: index < items.length - 1,
  })),
  pageParams: items.map((_, index) => index),
});

describe('쪽이 여러 개인 목록 캐시의 mutation 반영', () => {
  it('차단 해제는 받은 모든 쪽에서 그 행을 빼고 전체 수를 줄인다', async () => {
    server.use(http.delete('/api/bunches/:viewerId/blocks/:targetId', () => ok(null)));
    const client = createTestQueryClient();
    const block = (id: number) => ({ id, bunch: card(id), blockedAt: '2026-11-01T00:00:00Z' });
    client.setQueryData(bunchHomeKeys.blockPages('1'), pages([[block(1)], [block(2), block(3)]]));
    const { result } = renderHook(() => useUnblockBunchMutation('1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(() => result.current.mutateAsync({ targetId: '2', blockId: '2' }));

    const data = client.getQueryData<InfiniteData<BlockPage>>(bunchHomeKeys.blockPages('1'));
    expect(data?.pages.map((page) => page.items.map((item) => item.id))).toEqual([[1], [3]]);
    expect(data?.pages.map((page) => page.totalElements)).toEqual([2, 2]);
  });

  it('같은 차단이 두 쪽에 겹쳐 받혀도 해제 한 번에 전체 수는 1만 준다', async () => {
    server.use(http.delete('/api/bunches/:viewerId/blocks/:targetId', () => ok(null)));
    const client = createTestQueryClient();
    const block = (id: number) => ({ id, bunch: card(id), blockedAt: '2026-11-01T00:00:00Z' });
    client.setQueryData(bunchHomeKeys.blockPages('1'), pages([[block(2)], [block(2), block(3)]]));
    const { result } = renderHook(() => useUnblockBunchMutation('1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(() => result.current.mutateAsync({ targetId: '2', blockId: '2' }));

    const data = client.getQueryData<InfiniteData<BlockPage>>(bunchHomeKeys.blockPages('1'));
    expect(data?.pages.map((page) => page.totalElements)).toEqual([2, 2]);
  });

  it('모두 읽음은 받은 모든 쪽의 알림을 읽음으로, 읽지 않은 수를 서버 값으로 바꾼다', async () => {
    server.use(
      http.post('/api/bunches/:bunchId/notifications/read-all', () => ok({ unreadCount: 0 })),
    );
    const client = createTestQueryClient();
    const item = (id: number) => ({
      id,
      type: 'MEMBER_JOINED',
      title: `알림 ${id}`,
      body: '',
      createdAt: '2026-11-01T00:00:00Z',
      readAt: null,
      target: { kind: 'MEMBERS', bunchId: 1 },
    });
    const data = pages([[item(1)], [item(2)]]);
    client.setQueryData(bunchHomeKeys.notificationPages('1'), {
      ...data,
      pages: data.pages.map((page) => ({ ...page, unreadCount: 2 })),
    });
    const { result } = renderHook(() => useReadAllNotificationsMutation('1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(() => result.current.mutateAsync());

    const after = client.getQueryData<InfiniteData<NotificationPage>>(
      bunchHomeKeys.notificationPages('1'),
    );
    expect(after?.pages.flatMap((page) => page.items).every((entry) => entry.readAt)).toBe(true);
    expect(after?.pages.map((page) => page.unreadCount)).toEqual([0, 0]);
  });
});
