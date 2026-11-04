import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '../db/seed';

const { memberA, memberB, admin } = MOCK_MEMBER_IDS;
const base = `/api/bunches/${MOCK_BUNCH_ID}/bundles`;

type Snapshot = {
  id: number;
  status: string;
  createdBy: number;
  title: string;
  titleVersion: number;
  visibility: string | null;
  visibilityVersion: number;
  revision: number;
  photos: {
    id: number;
    photoId: number;
    caption: string;
    captionVersion: number;
    captionUpdatedBy: number | null;
  }[];
  participants: { memberId: number }[];
  comments: { memberId: number; content: string; version: number }[];
  dateChips: string[];
  publishBlockers: string[];
  permissions: Record<string, boolean>;
  leases: { target: string; memberId: number }[];
  publishedAt: string | null;
};

type Envelope = {
  success: boolean;
  data: Snapshot & { token: string; leaseVersion: number };
  error: { code: string; detail: unknown } | null;
};

const call = async (
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) => {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, json: (await response.json()) as Envelope };
};

const create = (photoIds: number[], key = createIdempotencyKey()) =>
  call('POST', base, { photoIds }, { 'Idempotency-Key': key });

// 내 사진(S4)과 멤버 A의 사진(S5)으로 만든 초안
const createDraft = async () => {
  const { json } = await create([MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S5]);
  return json.data as { id: number; revision: number; photos: { id: number }[] };
};

const acquire = async (bundleId: number, target: string) =>
  (await call('POST', `${base}/${bundleId}/leases/acquire`, { target })).json.data as {
    token: string;
  };

describe('가짜 서버 번들 초안 생성', () => {
  it('고른 순서대로 사진을 담고 생성자와 사진 올린 멤버가 참여자가 된다', async () => {
    const { status, json } = await create([
      MOCK_PHOTO_IDS.S5,
      MOCK_PHOTO_IDS.S4,
      MOCK_PHOTO_IDS.S1,
    ]);

    expect(status).toBe(200);
    const draft = json.data;
    expect(draft).toMatchObject({
      status: 'DRAFT',
      createdBy: MOCK_MY_MEMBER_ID,
      title: '',
      visibility: null,
      revision: 1,
    });
    expect(draft.photos.map((photo: { photoId: number }) => photo.photoId)).toEqual([
      MOCK_PHOTO_IDS.S5,
      MOCK_PHOTO_IDS.S4,
      MOCK_PHOTO_IDS.S1,
    ]);
    // 생성자 먼저, 이어서 사진을 올린 멤버(중복 없이)
    expect(draft.participants.map((p: { memberId: number }) => p.memberId)).toEqual([
      MOCK_MY_MEMBER_ID,
      memberA,
      admin,
    ]);
    expect(draft.permissions).toMatchObject({ creator: true, participant: true, canPublish: true });
    expect(draft.publishBlockers).toEqual([
      'TITLE_REQUIRED',
      'VISIBILITY_REQUIRED',
      'COMMENTS_REQUIRED',
    ]);
    // 날짜를 고르기 전에는 추천 촬영일을 돌려줌
    expect(draft.dateChips).toEqual(['2026-10-18']);
  });

  it('같은 키·같은 본문은 같은 초안을 돌려주고 다른 본문은 REQUEST_001이다', async () => {
    const key = createIdempotencyKey();
    const first = await create([MOCK_PHOTO_IDS.S4], key);
    const replay = await create([MOCK_PHOTO_IDS.S4], key);
    const other = await create([MOCK_PHOTO_IDS.S5], key);

    expect(replay.json.data.id).toBe(first.json.data.id);
    expect(mockDb.get().bundles).toHaveLength(1);
    expect(other.status).toBe(409);
    expect(other.json.error?.code).toBe('REQUEST_001');
  });

  it('Idempotency-Key가 없거나 사진이 0장·21장·중복이면 COMMON_001이다', async () => {
    const noKey = await call('POST', base, { photoIds: [MOCK_PHOTO_IDS.S4] });
    const none = await create([]);
    const dup = await create([MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S4]);
    const over = await create(Array.from({ length: 21 }, (_, i) => i + 1));

    for (const result of [noKey, none, dup, over]) {
      expect(result.status).toBe(400);
      expect(result.json.error?.code).toBe('COMMON_001');
    }
  });

  it('없는 사진이 섞이면 전체를 거부하고 초안을 만들지 않는다', async () => {
    const result = await create([MOCK_PHOTO_IDS.S4, 999]);

    expect(result.status).toBe(404);
    expect(mockDb.get().bundles).toHaveLength(0);
  });

  it('번치 멤버가 1명뿐이거나 초안이 10개면 BUNDLE_001이다', async () => {
    for (let i = 0; i < 10; i += 1) await create([MOCK_PHOTO_IDS.S4]);
    const tenth = await create([MOCK_PHOTO_IDS.S4]);
    expect(tenth.status).toBe(409);
    expect(tenth.json.error?.code).toBe('BUNDLE_001');

    mockDb.reset();
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.filter(
        (membership) => membership.memberId === MOCK_MY_MEMBER_ID,
      ),
    }));
    const alone = await create([MOCK_PHOTO_IDS.S4]);
    expect(alone.json.error?.code).toBe('BUNDLE_001');
  });

  it('번치 멤버가 아니면 AUTH_002, 없는 번치는 RESOURCE_001이다', async () => {
    const missing = await call(
      'POST',
      '/api/bunches/999/bundles',
      { photoIds: [1] },
      {
        'Idempotency-Key': createIdempotencyKey(),
      },
    );
    expect(missing.json.error?.code).toBe('RESOURCE_001');

    mockDb.update((current) => ({ ...current, memberships: [] }));
    expect((await create([MOCK_PHOTO_IDS.S4])).json.error?.code).toBe('AUTH_002');
  });
});

describe('가짜 서버 번들 상세 조회', () => {
  it('번치 멤버는 참여자가 아니어도 보되 권한 값은 보기 전용이다', async () => {
    const draft = await createDraft();
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        participants: bundle.participants.filter((p) => p.memberId !== MOCK_MY_MEMBER_ID),
      })),
    }));

    const { status, json } = await call('GET', `${base}/${draft.id}`);
    expect(status).toBe(200);
    expect(json.data.permissions).toMatchObject({ participant: false, canEdit: false });
  });

  it('없는 번들은 RESOURCE_001, 숫자가 아닌 id는 COMMON_001이다', async () => {
    expect((await call('GET', `${base}/999`)).json.error?.code).toBe('RESOURCE_001');
    expect((await call('GET', `${base}/abc`)).json.error?.code).toBe('COMMON_001');
  });
});

describe('가짜 서버 번들 제목·공개 범위·코멘트·캡션 저장', () => {
  it('편집권 token으로 제목을 저장하면 제목 버전과 revision이 오른다', async () => {
    const draft = await createDraft();
    const { token } = await acquire(draft.id, 'TITLE');

    const { status, json } = await call('PUT', `${base}/${draft.id}/title`, {
      value: '  설악산 단풍  ',
      expectedVersion: 0,
      mode: 'DRAFT',
      leaseToken: token,
    });

    expect(status).toBe(200);
    expect(json.data).toMatchObject({ title: '설악산 단풍', titleVersion: 1, revision: 2 });
  });

  it('편집권이 없거나 token이 다르면 BUNDLE_004이다', async () => {
    const draft = await createDraft();
    const body = { value: '제목', expectedVersion: 0, mode: 'DRAFT' };

    const none = await call('PUT', `${base}/${draft.id}/title`, body);
    expect(none.json.error?.code).toBe('BUNDLE_004');

    await acquire(draft.id, 'TITLE');
    const wrong = await call('PUT', `${base}/${draft.id}/title`, {
      ...body,
      leaseToken: createIdempotencyKey(),
    });
    expect(wrong.json.error?.code).toBe('BUNDLE_004');
  });

  it('다른 멤버가 편집권을 쥔 대상은 얻을 수 없다', async () => {
    const draft = await createDraft();
    mockDb.update((current) => ({
      ...current,
      bundleLeases: [
        {
          bundleId: draft.id,
          target: 'TITLE',
          memberId: memberA,
          token: createIdempotencyKey(),
          leaseVersion: 1,
          expiresAt: new Date(Date.now() + 10_000).toISOString(),
        },
      ],
    }));

    const result = await call('POST', `${base}/${draft.id}/leases/acquire`, { target: 'TITLE' });
    expect(result.status).toBe(409);
    expect(result.json.error?.code).toBe('BUNDLE_004');
    // 상세 응답에는 편집권 상태가 token 없이 공개됨
    const detail = await call('GET', `${base}/${draft.id}`);
    expect(Object.keys(detail.json.data.leases[0] ?? {}).sort()).toEqual([
      'expiresAt',
      'leaseVersion',
      'memberId',
      'target',
    ]);
    expect(detail.json.data.leases[0]).toMatchObject({ target: 'TITLE', memberId: memberA });
  });

  it('만료된 편집권은 다른 멤버가 다시 얻을 수 있다', async () => {
    const draft = await createDraft();
    mockDb.update((current) => ({
      ...current,
      bundleLeases: [
        {
          bundleId: draft.id,
          target: 'TITLE',
          memberId: memberA,
          token: createIdempotencyKey(),
          leaseVersion: 1,
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
      ],
    }));

    const result = await call('POST', `${base}/${draft.id}/leases/acquire`, { target: 'TITLE' });
    expect(result.status).toBe(200);
    expect(result.json.data.leaseVersion).toBe(2);
  });

  it('버전이 다르면 BUNDLE_003과 현재 값·버전을 돌려준다', async () => {
    const draft = await createDraft();
    const { token } = await acquire(draft.id, 'TITLE');
    await call('PUT', `${base}/${draft.id}/title`, {
      value: '첫 제목',
      expectedVersion: 0,
      mode: 'DRAFT',
      leaseToken: token,
    });

    const result = await call('PUT', `${base}/${draft.id}/title`, {
      value: '다른 제목',
      expectedVersion: 0,
      mode: 'DRAFT',
      leaseToken: token,
    });
    expect(result.status).toBe(409);
    expect(result.json.error).toMatchObject({
      code: 'BUNDLE_003',
      detail: { value: '첫 제목', version: 1 },
    });
  });

  it('같은 값을 다시 저장해도 버전과 revision은 그대로다', async () => {
    const draft = await createDraft();
    const result = await call('PUT', `${base}/${draft.id}/visibility`, {
      value: 'PRIVATE',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    const again = await call('PUT', `${base}/${draft.id}/visibility`, {
      value: 'PRIVATE',
      expectedVersion: 1,
      mode: 'DRAFT',
    });

    expect(result.json.data).toMatchObject({ visibility: 'PRIVATE', visibilityVersion: 1 });
    expect(again.json.data.revision).toBe(result.json.data.revision);
    expect(again.json.data.visibilityVersion).toBe(1);
  });

  it('서버 상태와 다른 mode는 BUNDLE_002이고 잘못된 입력은 COMMON_001이다', async () => {
    const draft = await createDraft();
    const wrongMode = await call('PUT', `${base}/${draft.id}/visibility`, {
      value: 'PUBLIC',
      expectedVersion: 0,
      mode: 'PUBLISHED',
    });
    expect(wrongMode.json.error?.code).toBe('BUNDLE_002');

    const badValue = await call('PUT', `${base}/${draft.id}/visibility`, {
      value: 'SECRET',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    expect(badValue.json.error?.code).toBe('COMMON_001');

    const { token } = await acquire(draft.id, 'TITLE');
    const newline = await call('PUT', `${base}/${draft.id}/title`, {
      value: '두 줄\n제목',
      expectedVersion: 0,
      mode: 'DRAFT',
      leaseToken: token,
    });
    expect(newline.json.error?.code).toBe('COMMON_001');
  });

  it('참여자가 아니면 초안을 고칠 수 없다(AUTH_002)', async () => {
    const draft = await createDraft();
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        participants: bundle.participants.filter((p) => p.memberId !== MOCK_MY_MEMBER_ID),
      })),
    }));

    const result = await call('PUT', `${base}/${draft.id}/visibility`, {
      value: 'PUBLIC',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    expect(result.status).toBe(403);
  });

  it('내 코멘트는 처음 저장하면 버전 1이고 다음 저장은 그 버전을 보내야 한다', async () => {
    const draft = await createDraft();
    const first = await call('PUT', `${base}/${draft.id}/comments/me`, {
      value: '함께 고른 사진이에요.',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    expect(first.json.data.comments).toEqual([
      expect.objectContaining({
        memberId: MOCK_MY_MEMBER_ID,
        content: '함께 고른 사진이에요.',
        version: 1,
      }),
    ]);

    const stale = await call('PUT', `${base}/${draft.id}/comments/me`, {
      value: '수정',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    expect(stale.json.error?.code).toBe('BUNDLE_003');
  });

  it('사진 캡션은 그 사진의 편집권으로 저장하고 사진마다 버전이 따로다', async () => {
    const draft = await createDraft();
    const [first, second] = draft.photos;
    const { token } = await acquire(draft.id, `PHOTO:${first?.id}`);

    const saved = await call('PUT', `${base}/${draft.id}/photos/${first?.id}/caption`, {
      value: '오래 기억할 순간',
      expectedVersion: 0,
      mode: 'DRAFT',
      leaseToken: token,
    });
    expect(saved.json.data.photos[0]).toMatchObject({
      caption: '오래 기억할 순간',
      captionVersion: 1,
      captionUpdatedBy: MOCK_MY_MEMBER_ID,
    });
    expect(saved.json.data.photos[1]).toMatchObject({ id: second?.id, captionVersion: 0 });

    // 다른 사진의 편집권 token으로는 저장할 수 없음
    const other = await call('PUT', `${base}/${draft.id}/photos/${second?.id}/caption`, {
      value: '다른 사진',
      expectedVersion: 0,
      mode: 'DRAFT',
      leaseToken: token,
    });
    expect(other.json.error?.code).toBe('BUNDLE_004');
  });
});

describe('가짜 서버 번들 참여자', () => {
  it('참여자를 더하면 빈 코멘트 row가 생기고 제외하면 코멘트가 함께 지워진다', async () => {
    const draft = await createDraft();
    const added = await call('POST', `${base}/${draft.id}/participants`, { memberId: memberB });
    expect(added.json.data.participants.map((p: { memberId: number }) => p.memberId)).toContain(
      memberB,
    );
    expect(added.json.data.comments).toEqual([
      expect.objectContaining({ memberId: memberB, content: '', version: draft.revision + 1 }),
    ]);

    const removed = await call('DELETE', `${base}/${draft.id}/participants/${memberB}`);
    expect(removed.status).toBe(200);
    expect(
      removed.json.data.participants.map((p: { memberId: number }) => p.memberId),
    ).not.toContain(memberB);
    expect(removed.json.data.comments).toEqual([]);
  });

  it('이미 참여 중이면 중복으로 더하지 않고 revision도 그대로다', async () => {
    const draft = await createDraft();
    const result = await call('POST', `${base}/${draft.id}/participants`, { memberId: memberA });

    expect(result.json.data.participants).toHaveLength(2);
    expect(result.json.data.revision).toBe(draft.revision);
  });

  it('일반 멤버는 다른 참여자를 제외할 수 없고 생성자는 제외할 수 없다', async () => {
    const draft = await createDraft();
    // 일반 멤버(생성자 아님)로 바꿔 보기
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({ ...bundle, createdBy: memberA })),
    }));
    const byMember = await call('DELETE', `${base}/${draft.id}/participants/${memberA}`);
    expect(byMember.status).toBe(403);

    // 관리자가 되어도 생성자는 제외할 수 없음
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.map((membership) =>
        membership.memberId === MOCK_MY_MEMBER_ID ? { ...membership, role: 'OWNER' } : membership,
      ),
    }));
    const creator = await call('DELETE', `${base}/${draft.id}/participants/${memberA}`);
    expect(creator.status).toBe(403);
  });

  it('번치 멤버가 아닌 사람은 더할 수 없다', async () => {
    const draft = await createDraft();
    const result = await call('POST', `${base}/${draft.id}/participants`, { memberId: 999 });
    expect(result.status).toBe(400);
  });
});

describe('가짜 서버 번들 발행', () => {
  // 발행 조건을 모두 채운 초안(제목·공개 범위·참여자 전원 코멘트)
  const fillDraft = async () => {
    const draft = await createDraft();
    const { token } = await acquire(draft.id, 'TITLE');
    await call('PUT', `${base}/${draft.id}/title`, {
      value: '설악산',
      expectedVersion: 0,
      mode: 'DRAFT',
      leaseToken: token,
    });
    await call('PUT', `${base}/${draft.id}/visibility`, {
      value: 'PRIVATE',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    await call('PUT', `${base}/${draft.id}/comments/me`, {
      value: '내 코멘트',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    // 멤버 A의 코멘트는 가짜 서버 데이터에 직접 넣음(내 계정으로는 남의 코멘트를 저장할 수 없음)
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        comments: [
          ...bundle.comments,
          {
            memberId: memberA,
            content: '멤버 코멘트',
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        revision: bundle.revision + 1,
      })),
    }));
    return draft.id;
  };

  const publish = (id: number, expectedRevision: number, key = createIdempotencyKey()) =>
    call('POST', `${base}/${id}/publish`, { expectedRevision }, { 'Idempotency-Key': key });

  const revisionOf = async (id: number) =>
    ((await call('GET', `${base}/${id}`)).json.data as { revision: number }).revision;

  it('조건이 모자라면 BUNDLE_005와 사유 목록을 돌려준다', async () => {
    const draft = await createDraft();
    const result = await publish(draft.id, draft.revision);

    expect(result.status).toBe(409);
    expect(result.json.error).toMatchObject({
      code: 'BUNDLE_005',
      detail: { reasons: ['TITLE_REQUIRED', 'VISIBILITY_REQUIRED', 'COMMENTS_REQUIRED'] },
    });
  });

  it('조건을 채우면 발행되고 편집권이 풀리며 이후 초안 저장은 BUNDLE_002이다', async () => {
    const id = await fillDraft();
    const result = await publish(id, await revisionOf(id));

    expect(result.status).toBe(200);
    expect(result.json.data).toMatchObject({
      status: 'PUBLISHED',
      publishBlockers: [],
      leases: [],
      permissions: { canPublish: false },
    });
    expect(result.json.data.publishedAt).not.toBeNull();
    expect(mockDb.get().bundleLeases).toEqual([]);

    const late = await call('PUT', `${base}/${id}/visibility`, {
      value: 'PUBLIC',
      expectedVersion: 1,
      mode: 'DRAFT',
    });
    expect(late.json.error?.code).toBe('BUNDLE_002');
  });

  it('revision이 다르면 BUNDLE_003이다', async () => {
    const id = await fillDraft();
    const result = await publish(id, 1);

    expect(result.status).toBe(409);
    expect(result.json.error?.code).toBe('BUNDLE_003');
  });

  it('같은 키로 다시 발행하면 같은 결과를 돌려주고 다른 키는 BUNDLE_002이다', async () => {
    const id = await fillDraft();
    const revision = await revisionOf(id);
    const key = createIdempotencyKey();
    const first = await publish(id, revision, key);
    const replay = await publish(id, revision, key);
    const other = await publish(id, revision);

    expect(replay.json.data.publishedAt).toBe(first.json.data.publishedAt);
    expect(other.json.error?.code).toBe('BUNDLE_002');
  });

  it('생성자도 관리자도 아닌 참여자는 발행할 수 없다(AUTH_002)', async () => {
    const id = await fillDraft();
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({ ...bundle, createdBy: memberA })),
    }));

    const result = await publish(id, await revisionOf(id));
    expect(result.status).toBe(403);
  });
});
