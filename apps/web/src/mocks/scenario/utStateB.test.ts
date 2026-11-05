import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '../db/seed';
import { resetToStateA, restoreStateB } from './utStateB';

const { memberA, memberB } = MOCK_MEMBER_IDS;
const base = `/api/bunches/${MOCK_BUNCH_ID}/bundles`;

type Snapshot = {
  id: number;
  revision: number;
  titleVersion: number;
  title: string;
  date: string | null;
  visibility: string | null;
  photos: { id: number; photoId: number; caption: string }[];
  participants: { memberId: number }[];
  comments: { memberId: number; content: string }[];
  locations?: { provider: string; externalId: string; name: string }[];
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
  it('시나리오 원문 텍스트로 채워진다(제목, P1·P2 캡션, 경진·은우 코멘트)', async () => {
    const { json } = await create([P1, P2, P3, P4]);
    const draft = json.data;
    const caption = (photoId: number) =>
      draft.photos.find((photo) => photo.photoId === photoId)?.caption;
    const comment = (memberId: number) =>
      draft.comments.find((item) => item.memberId === memberId)?.content;

    expect(draft.title).toBe('속초 첫째 날 🌊');
    expect(caption(P1)).toBe('아침 7시 영금정! 바람은 미쳤는데 바다 색이 진짜 예술이었다');
    expect(caption(P2)).toBe('닭강정 줄 30분 섰는데');
    expect(caption(P3)).toBe('');
    expect(caption(P4)).toBe('');
    expect(comment(memberA)).toBe(
      '닭강정 또 먹고 싶다… 다음엔 무조건 2박 3일로 가자! 사진 정리해줘서 고마워 🙌',
    );
    expect(comment(memberB)).toBe(
      '갯배 탈 때 다들 소리 지른 거 아직도 웃김ㅋㅋㅋ 바다 보면서 멍때린 시간이 제일 좋았어',
    );
  });

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

  it('P2 캡션은 멤버 A가, 위치는 멤버 B가 편집 중으로 고정되고 내가 편집권을 얻을 수 없다', async () => {
    const { json } = await create([P1, P2, P3, P4]);
    const second = json.data.photos.find((photo) => photo.photoId === P2)!;

    expect(json.data.leases).toEqual([
      expect.objectContaining({ target: `PHOTO:${second.id}`, memberId: memberA }),
      expect.objectContaining({ target: 'LOCATION', memberId: memberB }),
    ]);
    for (const target of [`PHOTO:${second.id}`, 'LOCATION']) {
      const acquire = await call('POST', `${base}/${json.data.id}/leases/acquire`, { target });
      expect(acquire.status).toBe(409);
    }
  });

  it('위치는 속초해수욕장 한 곳이 저장되어 있다', async () => {
    const { json } = await create([P1, P2, P3, P4]);

    expect(json.data.locations).toEqual([
      expect.objectContaining({ name: '속초해수욕장', provider: 'KAKAO' }),
    ]);
  });

  it('P1~P4가 아닌 사진 구성은 덧입히지 않는다', async () => {
    const { json: other } = await create([S4, S5]);
    const { json: three } = await create([P1, P2, P3]);

    for (const draft of [other.data, three.data]) {
      expect(draft.title).toBe('');
      expect(draft.date).toBeNull();
      expect(draft.comments).toEqual([]);
      expect(draft.leases).toEqual([]);
      expect(draft.locations ?? []).toEqual([]);
    }
  });
});

const MY_ID = MOCK_MEMBER_IDS.me;

const get = async (id: number) => (await call('GET', `${base}/${id}`)).json.data;

// 참여자가 세팅을 깨뜨린 상황: 경진·은우를 내보내고 제목·캡션·위치를 바꾸고 사진 구성을 바꾸고 공개 범위·내 코멘트를 채움
const breakDraft = (id: number) =>
  mockDb.update((state) => ({
    ...state,
    bundles: state.bundles.map((bundle) =>
      bundle.id === id
        ? {
            ...bundle,
            title: '내가 바꾼 제목',
            titleVersion: bundle.titleVersion + 3,
            visibility: 'PUBLIC' as const,
            visibilityVersion: 1,
            date: '2026-10-18',
            locations: [],
            locationsVersion: bundle.locationsVersion + 1,
            participants: bundle.participants.filter((p) => p.memberId === MY_ID),
            comments: [
              {
                memberId: MY_ID,
                content: '내 코멘트',
                version: 1,
                createdAt: bundle.createdAt,
                updatedAt: bundle.createdAt,
              },
            ],
            photos: bundle.photos.slice(0, 2).map((photo) => ({ ...photo, caption: '내 캡션' })),
          }
        : bundle,
    ),
    bundleLeases: state.bundleLeases.filter((lease) => lease.bundleId !== id),
  }));

describe('상태 B 되돌리기', () => {
  it('깨진 초안을 같은 초안에서 상태 B로 되돌린다(참여 멤버, 사진, 텍스트, 위치, 코멘트, 편집권)', async () => {
    const { json } = await create([P1, P2, P3, P4]);
    const id = json.data.id;
    breakDraft(id);

    restoreStateB(id);
    const draft = await get(id);

    expect(draft.id).toBe(id);
    expect(draft.title).toBe('속초 첫째 날 🌊');
    expect(draft.date).toBe('2026-10-17');
    expect(draft.visibility).toBeNull();
    expect(draft.locations?.map((location) => location.name)).toEqual(['속초해수욕장']);
    expect(draft.participants.map((p) => p.memberId)).toEqual([MY_ID, memberA, memberB]);
    expect(draft.comments.map((comment) => comment.memberId).sort()).toEqual([memberA, memberB]);
    expect(draft.photos.map((photo) => photo.photoId).sort()).toEqual([P1, P2, P3, P4].sort());
    expect(draft.photos.find((photo) => photo.photoId === P2)?.caption).toBe(
      '닭강정 줄 30분 섰는데',
    );
    expect(draft.photos.find((photo) => photo.photoId === P3)?.caption).toBe('');
    const second = draft.photos.find((photo) => photo.photoId === P2)!;
    expect(draft.leases).toEqual([
      expect.objectContaining({ target: `PHOTO:${second.id}`, memberId: memberA }),
      expect.objectContaining({ target: 'LOCATION', memberId: memberB }),
    ]);
  });

  it('버전과 revision은 올라가서 화면이 충돌로 보고 최신 값을 다시 받는다', async () => {
    const { json } = await create([P1, P2, P3, P4]);
    const before = json.data;
    breakDraft(before.id);
    const broken = await get(before.id);

    restoreStateB(before.id);
    const draft = await get(before.id);

    expect(draft.revision).toBeGreaterThan(broken.revision);
    expect(draft.titleVersion).toBeGreaterThan(broken.titleVersion);
  });

  it('없는 초안은 아무것도 바꾸지 않는다', () => {
    const before = mockDb.get();

    restoreStateB(999999);

    expect(mockDb.get().bundles).toEqual(before.bundles);
  });
});

describe('상태 A 초기화', () => {
  it('만든 초안과 편집권을 모두 지우고 기존 번들 2개만 남긴다', async () => {
    await create([P1, P2, P3, P4]);
    expect(mockDb.get().bundles.some((bundle) => bundle.status === 'DRAFT')).toBe(true);

    resetToStateA();

    const { bundles, bundleLeases } = mockDb.get();
    expect(bundles.map((bundle) => bundle.title)).toEqual([
      '강릉 커피 투어 ☕',
      '망원 한강 피크닉 🧺',
    ]);
    expect(bundleLeases).toEqual([]);
  });
});
