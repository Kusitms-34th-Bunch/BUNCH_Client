import type * as DesignSystem from '@app/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { FEED_MESSAGES } from '../constants/messages';
import { bundleDetailKeys } from './bundleDetail';
import { feedKeys } from './feed';
import { useBundleLikeMutation } from './like';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 지금 번치 1 명의의 피드 카드(번들 7)와 그 상세
const VIEWER = '1';
const feedKey = feedKeys.list(VIEWER);
const detailKey = bundleDetailKeys.detail('3', '7', VIEWER);
const likeOf = (data: unknown) => {
  const card = (data as { pages: { items: { bundle?: object }[] }[] }).pages[0]!.items[0]!.bundle;
  return card;
};

const setup = () => {
  const client = createTestQueryClient();
  client.setQueryData(feedKey, {
    pages: [
      { items: [{ type: 'BUNDLE', bundle: { id: 7, likedByCurrentBunch: false, likeCount: 2 } }] },
    ],
    pageParams: [undefined],
  });
  client.setQueryData(detailKey, { id: 7, likedByCurrentBunch: false, likeCount: 2 });
  const { result } = renderHook(() => useBundleLikeMutation(), {
    wrapper: createQueryWrapper(client),
  });
  return { client, result };
};

/** 요청마다 응답을 직접 풀어 주는 handler(나중에 보낸 요청보다 먼저 끝나게 하는 등 순서를 정함) */
const holdLikes = () => {
  const pending: ((_liked: boolean) => void)[] = [];
  const respond = (liked: boolean) =>
    new Promise<Response>((resolve) => {
      pending.push((likeCount) =>
        resolve(
          ok({
            bundleId: 7,
            currentBunchId: 1,
            likedByCurrentBunch: liked,
            likeCount: likeCount ? 3 : 2,
          }),
        ),
      );
    });
  server.use(
    http.put('/api/bundles/:bundleId/like', () => respond(true)),
    http.delete('/api/bundles/:bundleId/like', () => respond(false)),
  );
  return pending;
};

beforeEach(() => toast.mockClear());

describe('useBundleLikeMutation', () => {
  it('누르면 응답 전에 피드 카드와 상세가 함께 바뀌고, 응답 값으로 확정한 뒤 상세만 다시 받게 둔다', async () => {
    const pending = holdLikes();
    const { client, result } = setup();

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    await waitFor(() =>
      expect(likeOf(client.getQueryData(feedKey))).toMatchObject({
        likedByCurrentBunch: true,
        likeCount: 3,
      }),
    );
    expect(client.getQueryData(detailKey)).toMatchObject({ likedByCurrentBunch: true });

    await waitFor(() => expect(pending).toHaveLength(1));
    act(() => pending[0]!(true));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({ likeCount: 3 });
    expect(client.getQueryState(detailKey)?.isInvalidated).toBe(true);
    // 피드 목록은 쪽 전부를 다시 받지 않음
    expect(client.getQueryState(feedKey)?.isInvalidated).toBe(false);
  });

  it('실패하면 누르기 전 값으로 되돌리고 알린다', async () => {
    server.use(http.put('/api/bundles/:bundleId/like', () => fail(404, 'RESOURCE_001')));
    const { client, result } = setup();

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({
      likedByCurrentBunch: false,
      likeCount: 2,
    });
    expect(client.getQueryData(detailKey)).toMatchObject({ likedByCurrentBunch: false });
    expect(toast).toHaveBeenCalledWith(FEED_MESSAGES.likeFailed);
  });

  it('연타하면 앞선 응답이 뒤에 누른 값을 덮지 않고, 마지막 응답으로 맞춘다', async () => {
    const pending = holdLikes();
    const { client, result } = setup();

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    act(() => result.current.mutate({ bundleId: 7, liked: false, viewerId: VIEWER }));
    await waitFor(() =>
      expect(likeOf(client.getQueryData(feedKey))).toMatchObject({ likedByCurrentBunch: false }),
    );

    // 같은 scope라 첫 요청이 끝나야 둘째 요청이 나감
    await waitFor(() => expect(pending).toHaveLength(1));
    act(() => pending[0]!(true));
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({ likedByCurrentBunch: false });

    act(() => pending[1]!(false));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({
      likedByCurrentBunch: false,
      likeCount: 2,
    });
  });

  it('서버의 지금 번치가 화면 명의와 다르면 내 정보와 피드를 다시 받는다', async () => {
    server.use(
      http.put('/api/bundles/:bundleId/like', () =>
        ok({ bundleId: 7, currentBunchId: 2, likedByCurrentBunch: true, likeCount: 3 }),
      ),
    );
    const { client, result } = setup();
    client.setQueryData(sharedKeys.me(), {
      memberId: 'me',
      bunch: { id: VIEWER, name: '여행쥬아' },
    });

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryState(sharedKeys.me())?.isInvalidated).toBe(true);
    expect(client.getQueryState(feedKey)?.isInvalidated).toBe(true);
  });

  it('연달아 누른 요청이 모두 실패하면 첫 요청 전 값으로 돌아간다', async () => {
    server.use(
      http.put('/api/bundles/:bundleId/like', () => fail(500, 'COMMON_999')),
      http.delete('/api/bundles/:bundleId/like', () => fail(500, 'COMMON_999')),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    act(() => result.current.mutate({ bundleId: 7, liked: false, viewerId: VIEWER }));
    await waitFor(() => expect(client.isMutating()).toBe(0));

    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({
      likedByCurrentBunch: false,
      likeCount: 2,
    });
  });

  it('앞 요청이 성공하고 뒤 요청이 실패하면 앞 요청의 응답 값으로 돌아간다', async () => {
    server.use(
      http.put('/api/bundles/:bundleId/like', () =>
        ok({ bundleId: 7, currentBunchId: 1, likedByCurrentBunch: true, likeCount: 5 }),
      ),
      http.delete('/api/bundles/:bundleId/like', () => fail(500, 'COMMON_999')),
    );
    const { client, result } = setup();

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    act(() => result.current.mutate({ bundleId: 7, liked: false, viewerId: VIEWER }));
    await waitFor(() => expect(client.isMutating()).toBe(0));

    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({
      likedByCurrentBunch: true,
      likeCount: 5,
    });
  });

  it('피드 카드와 상세 값이 어긋나 있으면 실패할 때 각자 누르기 전 값으로 돌아간다', async () => {
    server.use(http.delete('/api/bundles/:bundleId/like', () => fail(500, 'COMMON_999')));
    const { client, result } = setup();
    // 상세를 나중에 받아 피드 카드보다 새 값
    client.setQueryData(detailKey, { id: 7, likedByCurrentBunch: true, likeCount: 5 });

    act(() => result.current.mutate({ bundleId: 7, liked: false, viewerId: VIEWER }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({
      likedByCurrentBunch: false,
      likeCount: 2,
    });
    expect(client.getQueryData(detailKey)).toMatchObject({
      likedByCurrentBunch: true,
      likeCount: 5,
    });
  });

  it('다른 명의로 같은 번들 요청이 남아 있어도 실패한 명의의 값은 되돌린다', async () => {
    server.use(http.put('/api/bundles/:bundleId/like', () => fail(500, 'COMMON_999')));
    const { client, result } = setup();

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: '2' }));
    await waitFor(() => expect(client.isMutating()).toBe(0));

    expect(likeOf(client.getQueryData(feedKey))).toMatchObject({
      likedByCurrentBunch: false,
      likeCount: 2,
    });
  });

  it('되돌릴 때 다른 번들 카드와 그사이 받은 쪽은 건드리지 않는다', async () => {
    server.use(http.put('/api/bundles/:bundleId/like', () => fail(500, 'COMMON_999')));
    const { client, result } = setup();

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    // 요청 중에 다음 쪽이 붙음
    client.setQueryData(feedKey, (data: { pages: unknown[]; pageParams: unknown[] }) => ({
      pages: [
        ...data.pages,
        { items: [{ type: 'BUNDLE', bundle: { id: 8, likedByCurrentBunch: true, likeCount: 1 } }] },
      ],
      pageParams: [...data.pageParams, 'next'],
    }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    const data = client.getQueryData(feedKey) as { pages: { items: { bundle: object }[] }[] };
    expect(data.pages).toHaveLength(2);
    expect(data.pages[1]!.items[0]!.bundle).toMatchObject({ id: 8, likedByCurrentBunch: true });
    expect(likeOf(data)).toMatchObject({ likedByCurrentBunch: false, likeCount: 2 });
  });

  it.each([
    [403, 'AUTH_002'],
    [404, 'BUNCH_009'],
    [409, 'BUNCH_010'],
  ])('%s(%s)로 실패하면 되돌리고 명의와 피드를 다시 받는다', async (status, code) => {
    server.use(http.put('/api/bundles/:bundleId/like', () => fail(status, code)));
    const { client, result } = setup();
    client.setQueryData(sharedKeys.me(), {
      memberId: 'me',
      bunch: { id: VIEWER, name: '여행쥬아' },
    });

    act(() => result.current.mutate({ bundleId: 7, liked: true, viewerId: VIEWER }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(client.getQueryState(sharedKeys.me())?.isInvalidated).toBe(true);
    expect(client.getQueryState(feedKey)?.isInvalidated).toBe(true);
  });
});
