import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '../db/seed';

const base = `/api/bunches/${MOCK_BUNCH_ID}/bundles`;
const { S4, S5, P1, P2, P3, P4 } = MOCK_PHOTO_IDS;

type Envelope = {
  success: boolean;
  data: { id: number; participants: { memberId: number }[] } | null;
  error: { code: string } | null;
};

const call = async (method: string, path: string, body?: unknown, headers = {}) => {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, json: (await response.json()) as Envelope };
};

const create = async (photoIds: number[]) =>
  (await call('POST', base, { photoIds }, { 'Idempotency-Key': createIdempotencyKey() })).json
    .data!;

const exists = (id: number) => mockDb.get().bundles.some((bundle) => bundle.id === id);

describe('가짜 서버 번들 삭제', () => {
  it('생성자가 지우면 번들과 편집권이 사라지고 data는 null이다', async () => {
    const draft = await create([P1, P2, P3, P4]);
    // 다른 멤버가 위치를 편집 중인 상태
    mockDb.update((state) => ({
      ...state,
      bundleLeases: [
        ...state.bundleLeases,
        {
          bundleId: draft.id,
          target: 'LOCATION',
          memberId: MOCK_MEMBER_IDS.memberB,
          token: '00000000-0000-4000-8000-00000000000b',
          leaseVersion: 1,
          expiresAt: '2999-01-01T00:00:00.000Z',
        },
      ],
    }));
    expect(mockDb.get().bundleLeases.some((lease) => lease.bundleId === draft.id)).toBe(true);

    const { status, json } = await call('DELETE', `${base}/${draft.id}`);

    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true, data: null });
    expect(exists(draft.id)).toBe(false);
    expect(mockDb.get().bundleLeases.some((lease) => lease.bundleId === draft.id)).toBe(false);
  });

  it('없는 번들은 RESOURCE_001, 사진함 원본은 지워지지 않는다', async () => {
    const photosBefore = mockDb.get().photos.length;
    const draft = await create([S4, S5]);
    await call('DELETE', `${base}/${draft.id}`);

    expect((await call('DELETE', `${base}/${draft.id}`)).json.error?.code).toBe('RESOURCE_001');
    expect(mockDb.get().photos).toHaveLength(photosBefore);
  });

  it('생성자도 관리자도 아니면 AUTH_002다', async () => {
    const draft = await create([S4, S5]);
    mockDb.update((state) => ({
      ...state,
      bundles: state.bundles.map((bundle) =>
        bundle.id === draft.id ? { ...bundle, createdBy: MOCK_MEMBER_IDS.memberA } : bundle,
      ),
    }));

    const { status, json } = await call('DELETE', `${base}/${draft.id}`);

    expect(status).toBe(403);
    expect(json.error?.code).toBe('AUTH_002');
    expect(exists(draft.id)).toBe(true);
  });
});

describe('가짜 서버 초안 나가기', () => {
  it('생성자가 나가면 초안이 삭제되고 data는 null이다', async () => {
    const draft = await create([S4, S5]);

    const { status, json } = await call('POST', `${base}/${draft.id}/leave`);

    expect(status).toBe(200);
    expect(json.data).toBeNull();
    expect(exists(draft.id)).toBe(false);
  });

  it('일반 참여자가 나가면 참여·코멘트·편집권이 지워지고 초안은 남는다', async () => {
    const draft = await create([S4, S5]);
    mockDb.update((state) => ({
      ...state,
      bundles: state.bundles.map((bundle) =>
        bundle.id === draft.id
          ? {
              ...bundle,
              createdBy: MOCK_MEMBER_IDS.memberA,
              comments: [
                {
                  memberId: MOCK_MEMBER_IDS.me,
                  content: '내 코멘트',
                  version: 1,
                  createdAt: bundle.createdAt,
                  updatedAt: bundle.createdAt,
                },
              ],
            }
          : bundle,
      ),
    }));

    const { json } = await call('POST', `${base}/${draft.id}/leave`);

    expect(json.data?.participants.map((p) => p.memberId)).not.toContain(MOCK_MEMBER_IDS.me);
    const stored = mockDb.get().bundles.find((bundle) => bundle.id === draft.id)!;
    expect(stored.comments).toEqual([]);
  });

  it('참여자가 아니면 AUTH_002, 발행본이면 BUNDLE_002다', async () => {
    const draft = await create([S4, S5]);
    const published = mockDb.get().bundles.find((bundle) => bundle.status === 'PUBLISHED')!;
    // 발행본의 참여자에는 내가 있으므로 BUNDLE_002
    expect((await call('POST', `${base}/${published.id}/leave`)).json.error?.code).toBe(
      'BUNDLE_002',
    );

    mockDb.update((state) => ({
      ...state,
      bundles: state.bundles.map((bundle) =>
        bundle.id === draft.id ? { ...bundle, participants: [] } : bundle,
      ),
    }));
    expect((await call('POST', `${base}/${draft.id}/leave`)).json.error?.code).toBe('AUTH_002');
  });
});
