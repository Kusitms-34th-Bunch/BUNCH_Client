import { http } from 'msw';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { MockBundle, MockBundlePhoto } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail } from '../lib/envelope';
import { runIdempotent } from '../lib/idempotency';
import { changeBundle, findScope, nowIso, readJson, snapshotOf, UUID } from './bundles';

// 번들 사진 구성 변경(`photos/changes`)·순서 이동(`photos/{bundlePhotoId}/move`) 명세(PR #32) 기준
const MAX_PHOTOS = 20;

const isPositiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

// 선택 배열(없으면 []): 양의 정수, 중복 없음, 최대 20개
const idList = (value: unknown): number[] | undefined => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_PHOTOS) return undefined;
  if (!value.every(isPositiveId) || new Set(value).size !== value.length) return undefined;
  return value;
};

const byPosition = (photos: readonly MockBundlePhoto[]) =>
  [...photos].sort((a, b) => a.position - b.position);

const renumber = (photos: readonly MockBundlePhoto[]): MockBundlePhoto[] =>
  photos.map((photo, position) => ({ ...photo, position }));

// 초안은 참여자만, 발행본의 사진은 생성자·번치 관리자만
const canEditPhotos = (
  bundle: MockBundle,
  scope: { isCreator: boolean; isAdmin: boolean; isParticipant: boolean },
) => (bundle.status === 'DRAFT' ? scope.isParticipant : scope.isCreator || scope.isAdmin);

export const bundlePhotoHandlers = [
  // POST /api/v1/bunches/{bunchId}/bundles/{bundleId}/photos/changes
  // 사진 추가·제거 차이를 최신 구성에 병합, 같은 Idempotency-Key와 본문은 처음 결과를 재생
  http.post('/api/bunches/:bunchId/bundles/:id/photos/changes', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bundle, bunchId } = scope;
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    const body = await readJson(request);
    const add = idList(body?.addPhotoIds);
    const remove = idList(body?.removeBundlePhotoIds);
    const mode = body?.mode;
    // 정원을 넘길 때: 기본은 전부 거절(ATOMIC_APPLY), PARTIAL_ADD는 남은 자리까지만 담음
    const capacityMode = body?.capacityMode ?? 'ATOMIC_APPLY';
    // 재선택 사진: 추가 목록에 든 기존 원본(ID·픽을 지키고 뒤로 옮김), ATOMIC_APPLY에서만 허용
    const reselected = idList(body?.reselectedPhotoIds);
    if (
      !body ||
      !key ||
      !UUID.test(key) ||
      !add ||
      !remove ||
      !reselected ||
      (mode !== 'DRAFT' && mode !== 'PUBLISHED') ||
      (capacityMode !== 'ATOMIC_APPLY' && capacityMode !== 'PARTIAL_ADD') ||
      (reselected.length > 0 && capacityMode !== 'ATOMIC_APPLY') ||
      !reselected.every((id) => add.includes(id))
    ) {
      return fail(400, 'COMMON_001');
    }
    if (mode !== bundle.status) return fail(409, 'BUNDLE_002');
    if (!canEditPhotos(bundle, scope)) return fail(403, 'AUTH_002');

    const outcome = runIdempotent(
      `${MOCK_MY_MEMBER_ID}:${bunchId}:photos:${bundle.id}`,
      key,
      JSON.stringify({ add, remove, mode, capacityMode, reselected }),
      () => {
        const state = mockDb.get();
        const current = state.bundles.find((item) => item.id === bundle.id);
        if (!current) return { status: 404, body: { code: 'RESOURCE_001' } };

        // 제거 ID가 다른 번들 소속이면 거부, 어느 번들에도 없는(이미 제거된) ID는 건너뜀
        const inOtherBundle = remove.some(
          (id) =>
            !current.photos.some((photo) => photo.id === id) &&
            state.bundles.some((item) => item.photos.some((photo) => photo.id === id)),
        );
        if (inOtherBundle) return { status: 404, body: { code: 'RESOURCE_001' } };
        const removing = current.photos.filter((photo) => remove.includes(photo.id));

        // 같은 원본을 한 요청에서 추가·제거할 수 없음
        if (removing.some((photo) => photo.photoId !== null && add.includes(photo.photoId))) {
          return { status: 400, body: { code: 'COMMON_001' } };
        }
        // 추가 사진은 같은 번치의 원본이어야 함(없는 원본은 COMMON_001)
        const sources = add.map((id) =>
          state.photos.find((photo) => photo.photoId === id && photo.bunchId === bunchId),
        );
        if (sources.some((photo) => photo === undefined)) {
          return { status: 400, body: { code: 'COMMON_001' } };
        }
        const staying = current.photos.filter((photo) => !remove.includes(photo.id));
        const existingOf = (id: number) => staying.find((photo) => photo.photoId === id);
        // 이미 번들에 있는 원본은 재선택일 때만 다시 담을 수 있음
        if (add.some((id) => existingOf(id) && !reselected.includes(id))) {
          return { status: 409, body: { code: 'BUNDLE_006' } };
        }
        // 이미 삭제된 재선택 사진은 되살리지 않음(새로 담지도 않음)
        const fresh = add.filter((id) => !existingOf(id) && !reselected.includes(id));
        const room = MAX_PHOTOS - staying.length;
        if (capacityMode === 'ATOMIC_APPLY' && fresh.length > room) {
          return { status: 409, body: { code: 'BUNDLE_006' } };
        }
        const accepted = capacityMode === 'PARTIAL_ADD' ? fresh.slice(0, Math.max(0, room)) : fresh;
        const rejected = fresh.filter((id) => !accepted.includes(id));
        const total = staying.length + accepted.length;
        if (total < 1) return { status: 409, body: { code: 'BUNDLE_006' } };
        const result = { addedPhotoIds: accepted, rejectedPhotoIds: rejected };
        const reselectedPhotos = add.flatMap((id) =>
          reselected.includes(id) ? (existingOf(id) ?? []) : [],
        );
        // 실제 구성 변화가 없으면 revision을 올리지 않음
        if (removing.length === 0 && accepted.length === 0 && reselectedPhotos.length === 0) {
          return { status: 200, body: { id: bundle.id, result } };
        }

        const at = nowIso();
        let nextId = Math.max(0, ...state.bundles.flatMap((item) => item.photos.map((p) => p.id)));
        const addedPhotos = new Map<number, MockBundlePhoto>(
          accepted.flatMap((id) => {
            const source = sources[add.indexOf(id)];
            return source
              ? [
                  [
                    id,
                    {
                      id: (nextId += 1),
                      photoId: source.photoId,
                      imageAssetId: source.photoId + 7000,
                      imageUrl: source.imageUrl,
                      position: 0,
                      addedBy: MOCK_MY_MEMBER_ID,
                      addedAt: at,
                    },
                  ] as const,
                ]
              : [];
          }),
        );
        // 재선택하지 않은 사진은 상대 순서를 지키고, 새로 담은 사진·재선택 사진은 선택 순서대로 뒤에 붙음
        const kept = byPosition(staying).filter((photo) => !reselectedPhotos.includes(photo));
        const tail = add.flatMap((id) => {
          const fresh = addedPhotos.get(id);
          if (fresh) return [fresh];
          return reselected.includes(id) ? (existingOf(id) ?? []) : [];
        });
        changeBundle(bundle.id, (latest) => ({ ...latest, photos: renumber([...kept, ...tail]) }));
        return { status: 200, body: { id: bundle.id, result } };
      },
    );
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    const stored = outcome.response;
    if (stored.status !== 200) return fail(stored.status, (stored.body as { code: string }).code);
    const { result } = stored.body as {
      result: { addedPhotoIds: number[]; rejectedPhotoIds: number[] };
    };
    // 같은 키 재시도는 최신 snapshot과 빈 결과(replayed)만 돌려줌
    return snapshotOf(bundle.id, {
      photoChangeResult:
        outcome.kind === 'replayed'
          ? { addedPhotoIds: [], rejectedPhotoIds: [], replayed: true }
          : { ...result, replayed: false },
    });
  }),

  // POST /api/v1/bunches/{bunchId}/bundles/{bundleId}/photos/{bundlePhotoId}/move
  // 이동 대상을 뺀 목록에서 서로 인접한 앞뒤 anchor 사이로 옮김
  http.post(
    '/api/bunches/:bunchId/bundles/:id/photos/:photoId/move',
    async ({ params, request }) => {
      const scope = findScope(params.bunchId, params.id);
      if ('error' in scope) return scope.error;
      const { bundle } = scope;
      const bundlePhotoId = toWireId(params.photoId);
      const body = await readJson(request);
      const previous = body?.previousBundlePhotoId ?? null;
      const next = body?.nextBundlePhotoId ?? null;
      const mode = body?.mode;
      const requestId = request.headers.get('X-Request-Id');
      if (
        !body ||
        bundlePhotoId === undefined ||
        (previous !== null && !isPositiveId(previous)) ||
        (next !== null && !isPositiveId(next)) ||
        (mode !== 'DRAFT' && mode !== 'PUBLISHED') ||
        (requestId !== null && !UUID.test(requestId))
      ) {
        return fail(400, 'COMMON_001');
      }
      if (mode !== bundle.status) return fail(409, 'BUNDLE_002');
      if (!canEditPhotos(bundle, scope)) return fail(403, 'AUTH_002');
      const moving = bundle.photos.find((photo) => photo.id === bundlePhotoId);
      if (!moving) return fail(404, 'RESOURCE_001');

      const perform = (): { status: number; body: unknown } => {
        // 자기 자신이나 같은 사진을 앞뒤 anchor로 쓰거나, 번들에 없는 anchor이거나, 양쪽 null인데 다른 사진이 있으면 BUNDLE_006
        // 앞뒤 anchor가 서로 인접하지 않아도 받아들이고, 뒤 anchor 직전을 우선하며 뒤 anchor가 없으면 앞 anchor 직후에 둠(v5 명세)
        const rest = byPosition(bundle.photos).filter((photo) => photo.id !== moving.id);
        const previousIndex =
          previous === null ? -1 : rest.findIndex((photo) => photo.id === previous);
        const nextIndex = next === null ? -1 : rest.findIndex((photo) => photo.id === next);
        const invalid =
          previous === moving.id ||
          next === moving.id ||
          (previous !== null && previous === next) ||
          (previous !== null && previousIndex < 0) ||
          (next !== null && nextIndex < 0) ||
          (previous === null && next === null && rest.length > 0);
        if (invalid) return { status: 409, body: { code: 'BUNDLE_006' } };
        const insertAt = next !== null ? nextIndex : previousIndex + 1;

        const moved = [...rest.slice(0, insertAt), moving, ...rest.slice(insertAt)];
        const unchanged = moved.every(
          (photo, index) => photo.id === byPosition(bundle.photos)[index]?.id,
        );
        // 자리가 같으면 revision을 올리지 않음
        if (!unchanged) {
          changeBundle(bundle.id, (latest) => ({ ...latest, photos: renumber(moved) }));
        }
        return { status: 200, body: null };
      };

      // 같은 X-Request-Id의 재시도는 옛 이동을 다시 적용하지 않고 최신 상태만 돌려줌(같은 ID에 다른 내용은 REQUEST_001)
      if (requestId === null) {
        const result = perform();
        if (result.status !== 200)
          return fail(result.status, (result.body as { code: string }).code);
        return snapshotOf(bundle.id);
      }
      const outcome = runIdempotent(
        `${MOCK_MY_MEMBER_ID}:${bundle.bunchId}:move:${bundle.id}`,
        requestId,
        JSON.stringify({ bundlePhotoId, previous, next, mode }),
        perform,
      );
      if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
      if (outcome.response.status !== 200) {
        return fail(outcome.response.status, (outcome.response.body as { code: string }).code);
      }
      return snapshotOf(bundle.id);
    },
  ),
];
