import { describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

type Item = {
  id: number;
  parentId: number | null;
  content: string;
  deleted: boolean;
  author: { nickname: string };
  badge: { name: string } | null;
  replyCount: number;
  canDelete: boolean;
  canReply: boolean;
  canReport: boolean;
};
type Page = { items: Item[]; nextCursor: string | null; hasNext: boolean; totalCount: number };

const call = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`/api/bundles/${path}`, init);
  const body = (await response.json()) as { data: T; error: { code: string } | null };
  return { status: response.status, data: body.data, code: body.error?.code };
};
const post = (bundleId: number, body: unknown, key: string = crypto.randomUUID()) =>
  call<Item>(`${bundleId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(body),
  });

describe('가짜 서버 번들 댓글', () => {
  it('원댓글은 최신순, 답글은 따로 오래된 순이고 차단한 번치의 댓글은 목록과 수에서 빠진다', async () => {
    const page = await call<Page>('901/comments');
    expect(page.data.items.map((item) => item.id)).toEqual([5005, 5003, 5001]);
    // 삭제 자리 포함, 차단 번치(5004) 제외
    expect(page.data.totalCount).toBe(4);
    const [mine, deleted, other] = page.data.items;
    expect(mine).toMatchObject({ canDelete: true, canReport: false, canReply: true });
    expect(deleted).toMatchObject({
      content: '삭제된 댓글입니다',
      author: { nickname: '작성자' },
      badge: null,
      canDelete: false,
      canReply: false,
      canReport: false,
    });
    expect(other).toMatchObject({ replyCount: 1, canReport: true, badge: { name: '캠핑러버' } });

    const replies = await call<Page>('901/comments/5001/replies');
    expect(replies.data.items.map((item) => item.content)).toEqual(['좋아요 🙌']);
    expect(replies.data.items[0]).toMatchObject({ canReply: false, replyCount: 0 });

    const feed = (await (await fetch('/api/feed')).json()) as {
      data: { items: { bundle?: { id: number; commentCount: number } }[] };
    };
    expect(feed.data.items.find((item) => item.bundle?.id === 901)?.bundle?.commentCount).toBe(4);
  });

  it('쪽을 나눠 받고, 다른 문맥의 커서는 400', async () => {
    const first = await call<Page>('901/comments?size=2');
    expect(first.data).toMatchObject({ hasNext: true });
    const next = await call<Page>(`901/comments?size=2&cursor=${first.data.nextCursor}`);
    expect(next.data.items.map((item) => item.id)).toEqual([5001]);
    expect(next.data.hasNext).toBe(false);
    expect(await call(`902/comments?cursor=${first.data.nextCursor}`)).toMatchObject({
      status: 400,
      code: 'COMMON_001',
    });
  });

  it('지금 번치 명의로 등록하고, 같은 키·내용은 한 번만, 다른 내용은 REQUEST_001', async () => {
    const key = crypto.randomUUID();
    const created = await post(901, { content: '  또 가고 싶어요\n진짜로  ' }, key);
    expect(created).toMatchObject({
      status: 200,
      data: { parentId: null, content: '또 가고 싶어요\n진짜로', badge: { name: '여행쥬아' } },
    });
    expect((await post(901, { content: '또 가고 싶어요\n진짜로' }, key)).data.id).toBe(
      created.data.id,
    );
    expect(await post(901, { content: '다른 내용' }, key)).toMatchObject({
      status: 409,
      code: 'REQUEST_001',
    });
    expect((await call<Page>('901/comments')).data.totalCount).toBe(5);

    const reply = await post(901, { content: '답글', parentId: 5001 });
    expect(reply.data).toMatchObject({ parentId: 5001, canReply: false });
  });

  it('답글 대상이 지워졌거나 답글이면 BUNDLE_002, 내용이 비거나 200자를 넘으면 400', async () => {
    expect(await post(901, { content: '답글', parentId: 5003 })).toMatchObject({
      status: 409,
      code: 'BUNDLE_002',
    });
    expect(await post(901, { content: '답글', parentId: 5002 })).toMatchObject({
      code: 'BUNDLE_002',
    });
    // 차단 번치의 댓글은 보이지 않아 없는 댓글
    expect(await post(901, { content: '답글', parentId: 5004 })).toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
    expect((await post(901, { content: '   ' })).status).toBe(400);
    expect((await post(901, { content: '가'.repeat(201) })).status).toBe(400);
    // 이모지는 한 글자로 셈
    expect((await post(901, { content: '🙌'.repeat(200) })).status).toBe(200);
  });

  it('내 댓글만 지우고 삭제 자리를 돌려주며, 다시 지워도 같다', async () => {
    const removed = await call<Item>('901/comments/5005', { method: 'DELETE' });
    expect(removed.data).toMatchObject({ id: 5005, deleted: true, content: '삭제된 댓글입니다' });
    expect((await call<Item>('901/comments/5005', { method: 'DELETE' })).status).toBe(200);
    expect(await call('901/comments/5001', { method: 'DELETE' })).toMatchObject({
      status: 403,
      code: 'AUTH_002',
    });
    expect(await call('901/comments/99999', { method: 'DELETE' })).toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
    // 삭제해도 수는 그대로
    expect((await call<Page>('901/comments')).data.totalCount).toBe(4);
  });

  it('소속 번치가 없으면 읽기만 되고 메뉴는 모두 꺼지며, 쓰기는 BUNCH_010', async () => {
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => item.bunchId !== MOCK_BUNCH_ID && item.bunchId !== MOCK_SECOND_BUNCH_ID,
      ),
    }));
    const page = await call<Page>('901/comments');
    expect(
      page.data.items.every((item) => !item.canDelete && !item.canReply && !item.canReport),
    ).toBe(true);
    // 차단은 지금 번치 기준이라 소속이 없으면 차단 번치 댓글도 보임
    expect(page.data.totalCount).toBe(5);
    expect(await post(901, { content: '안녕' })).toMatchObject({ status: 409, code: 'BUNCH_010' });
  });
});
