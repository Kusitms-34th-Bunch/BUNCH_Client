import { act, renderHook } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { feedKeys } from './keys';
import { useReportMutation } from './report';

const feedKey = feedKeys.list('1');
const REPORT = { reason: 'spam', detail: '' };

const setup = () => {
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
  const { result } = renderHook(useReportMutation, { wrapper: createQueryWrapper(client) });
  return { client, result };
};

const feedIds = (data: unknown) =>
  (data as { pages: { items: { bundle: { id: number } }[] }[] }).pages[0]!.items.map(
    (item) => item.bundle.id,
  );

describe('useReportMutation', () => {
  it('번들 신고가 접수되면 받아 둔 피드에서 그 카드를 뺀다', async () => {
    server.use(http.post('/api/bundles/:bundleId/reports', () => ok({ reportId: 1 })));
    const { client, result } = setup();

    await act(() => result.current.mutateAsync({ bundleId: '7', ...REPORT }));

    expect(feedIds(client.getQueryData(feedKey))).toEqual([8]);
  });

  it('신고 전에 시작된 피드 조회가 늦게 와도 뺀 카드를 다시 넣지 않는다', async () => {
    server.use(http.post('/api/bundles/:bundleId/reports', () => ok({ reportId: 1 })));
    const { client, result } = setup();
    const before = client.getQueryData(feedKey);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const late = client
      .fetchQuery({ queryKey: feedKey, queryFn: () => gate.then(() => before), staleTime: 0 })
      .catch(() => {});

    await act(() => result.current.mutateAsync({ bundleId: '7', ...REPORT }));
    release();
    await late;

    expect(feedIds(client.getQueryData(feedKey))).toEqual([8]);
  });

  it('댓글 신고나 접수되지 않은 신고는 피드를 그대로 둔다', async () => {
    server.use(
      http.post('/api/bundles/:bundleId/comments/:commentId/reports', () => ok({ reportId: 1 })),
      http.post('/api/bundles/:bundleId/reports', () => fail(409, 'BUNCH_011')),
    );
    const { client, result } = setup();

    await act(() => result.current.mutateAsync({ bundleId: '7', commentId: '3', ...REPORT }));
    await act(() => result.current.mutateAsync({ bundleId: '7', ...REPORT }).catch(() => {}));

    expect(feedIds(client.getQueryData(feedKey))).toEqual([7, 8]);
  });
});
