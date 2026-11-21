import { act, renderHook } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { feedKeys } from './keys';
import { useReportMutation } from './report';

describe('useReportMutation', () => {
  it('번들 신고가 접수돼도 받아 둔 피드를 그대로 둔다(신고만으로 숨기지 않음)', async () => {
    server.use(http.post('/api/bundles/:bundleId/reports', () => ok({ reportId: 1 })));
    const client = createTestQueryClient();
    const feed = {
      pages: [{ items: [{ type: 'BUNDLE', bundle: { id: 7 } }] }],
      pageParams: [undefined],
    };
    client.setQueryData(feedKeys.list('1'), feed);
    const { result } = renderHook(useReportMutation, { wrapper: createQueryWrapper(client) });

    await act(() => result.current.mutateAsync({ bundleId: '7', reason: 'spam', detail: '' }));

    expect(client.getQueryData(feedKeys.list('1'))).toEqual(feed);
  });
});
