import { describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

const report = async (path: string, body: unknown) => {
  const response = await fetch(`/api/bundles/${path}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as {
    data: { reportId: number } | null;
    error: { code: string } | null;
  };
  return { status: response.status, data: json.data, code: json.error?.code };
};

describe('가짜 서버 번들·댓글 신고', () => {
  it('번들과 남의 댓글을 지금 번치 명의로 접수한다', async () => {
    const bundle = await report('901', { reason: 'SPAM' });
    expect(bundle.status).toBe(200);
    expect(bundle.data?.reportId).toBeGreaterThan(0);
    expect(await report('901/comments/5001', { reason: 'OTHER', detail: '광고' })).toMatchObject({
      status: 200,
    });
    expect(mockDb.get().reports.slice(-2)).toMatchObject([
      { reporterBunchId: MOCK_BUNCH_ID, bundleId: 901, reason: 'SPAM' },
      { bundleId: 901, commentId: 5001, reason: 'OTHER', detail: '광고' },
    ]);
  });

  it('같은 번치가 같은 대상을 세 번째 신고하면 409 BUNCH_011이고 접수하지 않는다', async () => {
    expect(await report('901', { reason: 'SPAM' })).toMatchObject({ status: 200 });
    expect(await report('901', { reason: 'SPAM' })).toMatchObject({ status: 200 });
    const before = mockDb.get().reports.length;

    expect(await report('901', { reason: 'SPAM' })).toMatchObject({
      status: 409,
      code: 'BUNCH_011',
    });
    expect(mockDb.get().reports).toHaveLength(before);
    // 같은 번들의 댓글은 다른 대상
    expect(await report('901/comments/5001', { reason: 'SPAM' })).toMatchObject({ status: 200 });
  });

  it('삭제된 댓글·없는 댓글은 404, 내 댓글은 403, 잘못된 사유는 400이다', async () => {
    expect(await report('901/comments/5003', { reason: 'SPAM' })).toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
    expect(await report('901/comments/99999', { reason: 'SPAM' })).toMatchObject({ status: 404 });
    expect(await report('901/comments/5002', { reason: 'SPAM' })).toMatchObject({
      status: 403,
      code: 'AUTH_002',
    });
    expect(await report('901', { reason: 'spam' })).toMatchObject({
      status: 400,
      code: 'COMMON_001',
    });
  });

  it('볼 수 없는 번들과 소속 번치 없음은 오류다', async () => {
    expect(await report('99999', { reason: 'SPAM' })).toMatchObject({ status: 404 });
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => item.bunchId !== MOCK_BUNCH_ID && item.bunchId !== MOCK_SECOND_BUNCH_ID,
      ),
    }));
    expect(await report('901', { reason: 'SPAM' })).toMatchObject({
      status: 409,
      code: 'BUNCH_010',
    });
  });
});
