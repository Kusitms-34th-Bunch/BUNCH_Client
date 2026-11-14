import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '../server';
import { mockDb } from '../db';
import { mockDrafts } from '../db/drafts';
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
  }[];
  participants: { memberId: number }[];
  comments: { memberId: number; content: string; version: number }[];
  dateChips: string[];
  publishBlockers: string[];
  permissions: Record<string, boolean>;
  publishedAt: string | null;
};

type Envelope = {
  success: boolean;
  data: Snapshot;
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

const create = (
  photoIds: number[],
  key = createIdempotencyKey(),
  participantMemberIds: number[] = [memberA],
) => call('POST', base, { photoIds, participantMemberIds }, { 'Idempotency-Key': key });

// 내 사진(S4)과 멤버 A의 사진(S5)으로 만든 초안
const createDraft = async () => {
  const { json } = await create([MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S5]);
  return json.data as { id: number; revision: number; photos: { id: number }[] };
};

describe('가짜 서버 번들 초안 생성', () => {
  it('고른 순서대로 사진을 담고 생성자와 고른 멤버가 참여자가 된다', async () => {
    const { status, json } = await create(
      [MOCK_PHOTO_IDS.S5, MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S1],
      createIdempotencyKey(),
      [admin, memberA],
    );

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
    // 생성자 먼저, 이어서 고른 순서대로(사진을 올렸다는 이유로 자동 참여하지 않음)
    expect(draft.participants.map((p: { memberId: number }) => p.memberId)).toEqual([
      MOCK_MY_MEMBER_ID,
      admin,
      memberA,
    ]);
    expect(draft.permissions).toMatchObject({ creator: true, participant: true, canPublish: true });
    // 공개 범위는 최종 발행 요청에서만 확인해 준비 상태에는 넣지 않음
    expect(draft.publishBlockers).toEqual(['TITLE_REQUIRED', 'COMMENTS_REQUIRED']);
    // 날짜를 고르기 전에는 추천 촬영일을 돌려줌
    expect(draft.dateChips).toEqual(['2026-10-18']);
  });

  it('같은 키·같은 본문은 같은 초안을 돌려주고 다른 본문은 REQUEST_001이다', async () => {
    const key = createIdempotencyKey();
    const first = await create([MOCK_PHOTO_IDS.S4], key);
    const replay = await create([MOCK_PHOTO_IDS.S4], key);
    const other = await create([MOCK_PHOTO_IDS.S5], key);

    expect(replay.json.data.id).toBe(first.json.data.id);
    expect(mockDrafts()).toHaveLength(1);
    expect(other.status).toBe(409);
    expect(other.json.error?.code).toBe('REQUEST_001');
  });

  it('Idempotency-Key가 없거나 사진이 0장·21장·중복이면 COMMON_001이다', async () => {
    const noKey = await call('POST', base, {
      photoIds: [MOCK_PHOTO_IDS.S4],
      participantMemberIds: [memberA],
    });
    const none = await create([]);
    const dup = await create([MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S4]);
    const over = await create(Array.from({ length: 21 }, (_, i) => i + 1));

    for (const result of [noKey, none, dup, over]) {
      expect(result.status).toBe(400);
      expect(result.json.error?.code).toBe('COMMON_001');
    }
  });

  it('참여 멤버가 없거나 나를 넣었거나 중복이거나 번치 멤버가 아니면 COMMON_001이고 초안을 만들지 않는다', async () => {
    const photos = [MOCK_PHOTO_IDS.S4];
    const none = await create(photos, createIdempotencyKey(), []);
    const self = await create(photos, createIdempotencyKey(), [MOCK_MY_MEMBER_ID]);
    const dup = await create(photos, createIdempotencyKey(), [memberA, memberA]);
    const stranger = await create(photos, createIdempotencyKey(), [memberA, 999]);
    const omitted = await call(
      'POST',
      base,
      { photoIds: photos },
      { 'Idempotency-Key': createIdempotencyKey() },
    );

    for (const result of [none, self, dup, stranger, omitted]) {
      expect(result.status).toBe(400);
      expect(result.json.error?.code).toBe('COMMON_001');
    }
    expect(mockDrafts()).toHaveLength(0);
  });

  it('없는 사진이 섞이면 PHOTO_004로 전체를 거부하고 없는 사진 ID를 알려 준다', async () => {
    const result = await create([MOCK_PHOTO_IDS.S4, 999]);

    expect(result.status).toBe(409);
    expect(result.json.error).toMatchObject({
      code: 'PHOTO_004',
      detail: { missingPhotoIds: [999] },
    });
    expect(mockDrafts()).toHaveLength(0);
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
      { photoIds: [1], participantMemberIds: [memberA] },
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

describe('가짜 서버 번들 제목·공개 범위·코멘트 저장', () => {
  it('제목을 저장하면 제목 버전과 revision이 오른다', async () => {
    const draft = await createDraft();

    const { status, json } = await call('PUT', `${base}/${draft.id}/title`, {
      value: '  설악산 단풍  ',
      expectedVersion: 0,
      mode: 'DRAFT',
    });

    expect(status).toBe(200);
    expect(json.data).toMatchObject({ title: '설악산 단풍', titleVersion: 1, revision: 2 });
  });

  it('버전이 다르면 BUNDLE_003과 현재 값·버전을 돌려준다', async () => {
    const draft = await createDraft();
    await call('PUT', `${base}/${draft.id}/title`, {
      value: '첫 제목',
      expectedVersion: 0,
      mode: 'DRAFT',
    });

    const result = await call('PUT', `${base}/${draft.id}/title`, {
      value: '다른 제목',
      expectedVersion: 0,
      mode: 'DRAFT',
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

    const newline = await call('PUT', `${base}/${draft.id}/title`, {
      value: '두 줄\n제목',
      expectedVersion: 0,
      mode: 'DRAFT',
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
  const fillDraft = async ({ withVisibility = true } = {}) => {
    const draft = await createDraft();
    await call('PUT', `${base}/${draft.id}/title`, {
      value: '설악산',
      expectedVersion: 0,
      mode: 'DRAFT',
    });
    if (withVisibility) {
      await call('PUT', `${base}/${draft.id}/visibility`, {
        value: 'PRIVATE',
        expectedVersion: 0,
        mode: 'DRAFT',
      });
    }
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

  it('조건을 채우면 발행되고 이후 초안 저장은 BUNDLE_002이다', async () => {
    const id = await fillDraft();
    const result = await publish(id, await revisionOf(id));

    expect(result.status).toBe(200);
    expect(result.json.data).toMatchObject({
      status: 'PUBLISHED',
      publishBlockers: [],
      permissions: { canPublish: false },
    });
    expect(result.json.data.publishedAt).not.toBeNull();

    const late = await call('PUT', `${base}/${id}/visibility`, {
      value: 'PUBLIC',
      expectedVersion: 1,
      mode: 'DRAFT',
    });
    expect(late.json.error?.code).toBe('BUNDLE_002');
  });

  it('낡은 expectedRevision도 최초 발행을 거절하지 않는다(호환 필드)', async () => {
    const id = await fillDraft();
    const result = await publish(id, 1);

    expect(result.status).toBe(200);
    expect(result.json.data.status).toBe('PUBLISHED');
  });

  it('최종 공개 범위를 함께 보내면 그 범위로 발행되고, 초안 범위도 없으면 VISIBILITY_REQUIRED다', async () => {
    const id = await fillDraft({ withVisibility: false });
    const missing = await call(
      'POST',
      `${base}/${id}/publish`,
      {},
      { 'Idempotency-Key': createIdempotencyKey() },
    );
    expect(missing.status).toBe(409);
    expect(missing.json.error).toMatchObject({
      code: 'BUNDLE_005',
      detail: { reasons: ['VISIBILITY_REQUIRED'] },
    });

    const result = await call(
      'POST',
      `${base}/${id}/publish`,
      { visibility: 'PUBLIC' },
      { 'Idempotency-Key': createIdempotencyKey() },
    );
    expect(result.status).toBe(200);
    expect(result.json.data).toMatchObject({ status: 'PUBLISHED', visibility: 'PUBLIC' });
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
