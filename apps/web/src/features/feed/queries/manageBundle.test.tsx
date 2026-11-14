import { act, renderHook } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { feedKeys } from './keys';
import {
  useDeletePublishedBundleMutation,
  useForgetBundle,
  useSavePublishedVisibilityMutation,
} from './manageBundle';

// 지금 번치 1 명의의 피드(번들 7·8)와 번들 7의 상세·댓글
const VIEWER = '1';
const target = { bunchId: '1', bundleId: '7', viewerId: VIEWER };
const feedKey = feedKeys.list(VIEWER);
const detailKey = feedKeys.detail('1', '7', VIEWER);
const commentsKey = feedKeys.comments('7', VIEWER);

const setup = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  client.setQueryData(feedKey, {
    pages: [
      {
        items: [
          { type: 'BUNDLE', bundle: { id: 7 } },
          { type: 'BUNDLE', bundle: { id: 8 } },
        ],
      },
    ],
    pageParams: [undefined],
  });
  client.setQueryData(detailKey, { id: 7, visibility: 'PUBLIC' });
  client.setQueryData(commentsKey, { pages: [], pageParams: [undefined] });
  const { result } = renderHook(hook, { wrapper: createQueryWrapper(client) });
  return { client, result };
};

const feedIds = (data: unknown) =>
  (data as { pages: { items: { bundle: { id: number } }[] }[] }).pages[0]!.items.map(
    (item) => item.bundle.id,
  );

const snapshot = (visibility: 'PUBLIC' | 'PRIVATE') => ({
  status: 'PUBLISHED',
  visibility,
  visibilityVersion: 4,
  permissions: { canEdit: true },
});

describe('발행 번들 삭제·공개 범위', () => {
  it('삭제하면 피드 카드를 빼고 번치 홈을 다시 받게 하며, 상세는 화면이 떠날 때까지 둔다', async () => {
    server.use(http.delete('/api/bunches/:bunchId/bundles/:id', () => ok(null)));
    const { client, result } = setup(() => ({
      remove: useDeletePublishedBundleMutation(),
      forget: useForgetBundle('7'),
    }));
    client.setQueryData(sharedKeys.publishedBundles('1'), []);

    await act(() => result.current.remove.mutateAsync(target));

    expect(feedIds(client.getQueryData(feedKey))).toEqual([8]);
    expect(client.getQueryState(sharedKeys.publishedBundles('1'))?.isInvalidated).toBe(true);
    expect(client.getQueryData(detailKey)).toBeDefined();

    act(() => result.current.forget());
    expect(client.getQueryData(detailKey)).toBeUndefined();
    expect(client.getQueryData(commentsKey)).toBeUndefined();
  });

  it('멤버 공개로 저장하면 상세는 공개 범위만 바꿔 두고 피드에서 뺀다', async () => {
    let body: unknown;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', async ({ request }) => {
        body = await request.json();
        return ok(snapshot('PRIVATE'));
      }),
    );
    const { client, result } = setup(() => useSavePublishedVisibilityMutation());

    await act(() =>
      result.current.mutateAsync({ ...target, value: 'PRIVATE', expectedVersion: 3 }),
    );

    expect(body).toEqual({ value: 'PRIVATE', expectedVersion: 3, mode: 'PUBLISHED' });
    expect(client.getQueryData(detailKey)).toEqual({ id: 7, visibility: 'PRIVATE' });
    expect(client.getQueryData(feedKeys.managed('1', '7', VIEWER))).toMatchObject({
      visibilityVersion: 4,
    });
    expect(feedIds(client.getQueryData(feedKey))).toEqual([8]);
  });

  it('전체 공개로 저장하면 피드 카드는 그대로다', async () => {
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', () => ok(snapshot('PUBLIC'))),
    );
    const { client, result } = setup(() => useSavePublishedVisibilityMutation());

    await act(() => result.current.mutateAsync({ ...target, value: 'PUBLIC', expectedVersion: 3 }));

    expect(feedIds(client.getQueryData(feedKey))).toEqual([7, 8]);
  });
});
