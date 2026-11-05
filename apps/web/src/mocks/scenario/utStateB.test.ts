import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '../db/seed';

const { memberA, memberB } = MOCK_MEMBER_IDS;
const base = `/api/bunches/${MOCK_BUNCH_ID}/bundles`;

type Snapshot = {
  id: number;
  title: string;
  date: string | null;
  visibility: string | null;
  photos: { id: number; photoId: number; caption: string }[];
  participants: { memberId: number }[];
  comments: { memberId: number; content: string }[];
  leases: { target: string; memberId: number }[];
  publishBlockers: string[];
};

const call = async (method: string, path: string, body?: unknown, headers = {}) => {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, json: (await response.json()) as { data: Snapshot } };
};

const create = (photoIds: number[]) =>
  call('POST', base, { photoIds }, { 'Idempotency-Key': createIdempotencyKey() });

const { P1, P2, P3, P4, S4, S5 } = MOCK_PHOTO_IDS;

// UT 상태 B: 참여자가 P1~P4로 번들을 만든 직후의 초안
describe('UT 상태 B 시나리오', () => {
  it('P1~P4로 만들면 제목·날짜·P1 캡션·멤버 A·B 코멘트가 채워진다', async () => {
    const { json } = await create([P1, P2, P3, P4]);
    const draft = json.data;

    expect(draft.title).not.toBe('');
    expect(draft.date).toBe('2026-10-17');
    expect(draft.photos.find((photo) => photo.photoId === P1)?.caption).not.toBe('');
    expect(draft.photos.find((photo) => photo.photoId === P3)?.caption).toBe('');
    expect(draft.photos.find((photo) => photo.photoId === P4)?.caption).toBe('');
    expect(draft.comments.map((comment) => comment.memberId).sort()).toEqual([memberA, memberB]);
    // 참여자의 코멘트와 공개 범위는 아직 없음
    expect(draft.visibility).toBeNull();
  });

  it('참여 멤버와 사진 순서는 서버 규칙대로다(생성자 먼저, 고른 순서)', async () => {
    const { json } = await create([P1, P2, P3, P4]);

    expect(json.data.participants.map((p) => p.memberId)).toEqual([
      MOCK_MEMBER_IDS.me,
      memberA,
      memberB,
    ]);
    expect(json.data.photos.map((photo) => photo.photoId)).toEqual([P1, P2, P3, P4]);
  });

  it('P2는 멤버 A가 편집 중으로 고정되고 내가 편집권을 얻을 수 없다', async () => {
    const { json } = await create([P1, P2, P3, P4]);
    const second = json.data.photos.find((photo) => photo.photoId === P2)!;

    expect(json.data.leases).toEqual([
      expect.objectContaining({ target: `PHOTO:${second.id}`, memberId: memberA }),
    ]);
    const acquire = await call('POST', `${base}/${json.data.id}/leases/acquire`, {
      target: `PHOTO:${second.id}`,
    });
    expect(acquire.status).toBe(409);
  });

  it('P1~P4가 아닌 사진 구성은 덧입히지 않는다', async () => {
    const { json: other } = await create([S4, S5]);
    const { json: three } = await create([P1, P2, P3]);

    for (const draft of [other.data, three.data]) {
      expect(draft.title).toBe('');
      expect(draft.date).toBeNull();
      expect(draft.comments).toEqual([]);
      expect(draft.leases).toEqual([]);
    }
  });
});
