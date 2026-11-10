import { http } from 'msw';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { CharacterType, MockBunch } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { runIdempotent } from '../lib/idempotency';
import { readJson } from './bundles';

// 백엔드 명세(번치 생성·이름 중복 확인·번치 사진·초대 발급) 기준
const NAME_MAX = 12;
const INTRODUCTION_MAX = 50;
const MAX_ACTIVE_BUNCHES = 10;
const CHARACTER_TYPES: readonly CharacterType[] = ['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'];
/** 한글·영문·숫자·ASCII 공백만 허용(대소문자와 내부 공백을 구분) */
const NAME_PATTERN = /^[A-Za-z0-9가-힣 ]+$/;

const normalizeName = (value: string) => value.normalize('NFC').trim();
const isValidName = (name: string) =>
  [...name].length >= 1 && [...name].length <= NAME_MAX && NAME_PATTERN.test(name);
const isNameTaken = (name: string, exceptBunchId?: number) =>
  mockDb.get().bunches.some((bunch) => bunch.name === name && bunch.id !== exceptBunchId);

const bunchBody = (bunch: MockBunch) => ({
  id: bunch.id,
  name: bunch.name,
  characterType: bunch.characterType,
  imageUrl: bunch.imageUrl,
});

/** 요청한 회원이 OWNER인 번치. 없으면 오류 응답을 돌려줌 */
const findOwnedBunch = (rawId: unknown) => {
  const bunchId = toWireId(rawId as string | undefined);
  if (bunchId === undefined) return { error: fail(400, 'COMMON_001') };
  const { bunches, memberships } = mockDb.get();
  const bunch = bunches.find((item) => item.id === bunchId);
  if (!bunch) return { error: fail(404, 'RESOURCE_001') };
  const mine = memberships.find(
    (item) => item.bunchId === bunchId && item.memberId === MOCK_MY_MEMBER_ID,
  );
  if (mine?.role !== 'OWNER') return { error: fail(403, 'AUTH_002') };
  return { bunch };
};

const changeBunch = (bunchId: number, change: (_bunch: MockBunch) => MockBunch) =>
  mockDb.update((current) => ({
    ...current,
    bunches: current.bunches.map((bunch) => (bunch.id === bunchId ? change(bunch) : bunch)),
  }));

/** 가짜 서버가 올린 번치 사진 대신 쓰는 시연용 이미지(서버는 업로드한 파일의 https 주소를 돌려줌) */
const MOCK_UPLOADED_BUNCH_IMAGE = '/mock/photos/C1.jpg';

export const bunchOnboardingHandlers = [
  // GET /api/v1/bunches/name-availability
  http.get('/api/bunches/name-availability', ({ request }) => {
    const name = normalizeName(new URL(request.url).searchParams.get('name') ?? '');
    if (!isValidName(name)) return fail(400, 'COMMON_001');
    return ok({ normalizedValue: name, available: !isNameTaken(name) });
  }),

  // POST /api/v1/bunches: 가입 완료 회원, 소속 10개 미만. 같은 멱등 키·입력은 처음 만든 번치를 돌려줌
  http.post('/api/bunches', async ({ request }) => {
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    const body = await readJson(request);
    if (!key || !body) return fail(400, 'COMMON_001');
    const name = typeof body.name === 'string' ? normalizeName(body.name) : '';
    const introduction = typeof body.introduction === 'string' ? body.introduction.trim() : '';
    const visibility = body.visibility;
    const characterType = body.characterType as CharacterType;
    if (
      !isValidName(name) ||
      [...introduction].length < 1 ||
      [...introduction].length > INTRODUCTION_MAX ||
      (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') ||
      !CHARACTER_TYPES.includes(characterType)
    ) {
      return fail(400, 'COMMON_001');
    }

    const outcome = runIdempotent(
      `${MOCK_MY_MEMBER_ID}:bunch-create`,
      key,
      JSON.stringify({ name, introduction, visibility, characterType }),
      () => {
        const current = mockDb.get();
        if (
          current.memberships.filter((m) => m.memberId === MOCK_MY_MEMBER_ID).length >=
          MAX_ACTIVE_BUNCHES
        ) {
          return { status: 409, body: { code: 'BUNCH_003' } };
        }
        if (isNameTaken(name)) return { status: 409, body: { code: 'BUNCH_001' } };
        const id = Math.max(0, ...current.bunches.map((bunch) => bunch.id)) + 1;
        mockDb.update((state) => ({
          ...state,
          bunches: [
            ...state.bunches,
            {
              id,
              name,
              characterType,
              imageUrl: null,
              introduction,
              isPrivate: visibility === 'PRIVATE',
              followerCount: 0,
              followingCount: 0,
            },
          ],
          memberships: [
            ...state.memberships,
            { bunchId: id, memberId: MOCK_MY_MEMBER_ID, role: 'OWNER' },
          ],
        }));
        return { status: 200, body: { id } };
      },
    );
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    const stored = outcome.response;
    if (stored.status !== 200) return fail(stored.status, (stored.body as { code: string }).code);
    const created = mockDb
      .get()
      .bunches.find((bunch) => bunch.id === (stored.body as { id: number }).id);
    return created ? ok(bunchBody(created)) : fail(404, 'RESOURCE_001');
  }),

  // PUT /api/v1/bunches/{id}/profile-image: OWNER만, multipart 본문은 읽지 않고 시연용 이미지로 바꿈
  http.put('/api/bunches/:id/profile-image', ({ params }) => {
    const owned = findOwnedBunch(params.id);
    if ('error' in owned) return owned.error;
    changeBunch(owned.bunch.id, (bunch) => ({ ...bunch, imageUrl: MOCK_UPLOADED_BUNCH_IMAGE }));
    const changed = mockDb.get().bunches.find((bunch) => bunch.id === owned.bunch.id);
    return changed ? ok(bunchBody(changed)) : fail(404, 'RESOURCE_001');
  }),

  // DELETE /api/v1/bunches/{id}/profile-image: OWNER만, 이미 기본 이미지여도 성공
  http.delete('/api/bunches/:id/profile-image', ({ params }) => {
    const owned = findOwnedBunch(params.id);
    if ('error' in owned) return owned.error;
    changeBunch(owned.bunch.id, (bunch) => ({ ...bunch, imageUrl: null }));
    const changed = mockDb.get().bunches.find((bunch) => bunch.id === owned.bunch.id);
    return changed ? ok(bunchBody(changed)) : fail(404, 'RESOURCE_001');
  }),

  // POST /api/v1/bunches/{id}/invitations: 번치당 유효한 링크 1개(같은 번치는 같은 링크를 돌려줌)
  http.post('/api/bunches/:id/invitations', ({ params }) => {
    const bunchId = toWireId(params.id);
    if (bunchId === undefined) return fail(400, 'COMMON_001');
    const { bunches, memberships } = mockDb.get();
    if (!bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    if (!memberships.some((m) => m.bunchId === bunchId && m.memberId === MOCK_MY_MEMBER_ID)) {
      return fail(403, 'AUTH_002');
    }
    const code = `MOCK${String(bunchId).padStart(4, '0')}`;
    return ok({
      url: `https://bunch.app/invite/${code}`,
      code,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }),
];
