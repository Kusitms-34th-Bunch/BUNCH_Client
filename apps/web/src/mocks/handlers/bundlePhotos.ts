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
    if (
      !body ||
      !key ||
      !UUID.test(key) ||
      !add ||
      !remove ||
      (mode !== 'DRAFT' && mode !== 'PUBLISHED')
    ) {
      return fail(400, 'COMMON_001');
    }
    if (mode !== bundle.status) return fail(409, 'BUNDLE_002');
    if (!canEditPhotos(bundle, scope)) return fail(403, 'AUTH_002');

    const outcome = runIdempotent(
      `${MOCK_MY_MEMBER_ID}:${bunchId}:photos:${bundle.id}`,
      key,
      JSON.stringify({ add, remove, mode }),
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
        // 추가 사진은 같은 번치의 원본이어야 하고 이미 번들에 있는 원본은 다시 추가할 수 없음
        const sources = add.map((id) =>
          state.photos.find((photo) => photo.photoId === id && photo.bunchId === bunchId),
        );
        if (sources.some((photo) => photo === undefined)) {
          return { status: 404, body: { code: 'RESOURCE_001' } };
        }
        const staying = current.photos.filter((photo) => !remove.includes(photo.id));
        if (add.some((id) => staying.some((photo) => photo.photoId === id))) {
          return { status: 409, body: { code: 'BUNDLE_006' } };
        }
        const total = staying.length + add.length;
        if (total < 1 || total > MAX_PHOTOS) return { status: 409, body: { code: 'BUNDLE_006' } };
        // 실제 구성 변화가 없으면 revision을 올리지 않음
        if (removing.length === 0 && add.length === 0)
          return { status: 200, body: { id: bundle.id } };

        const at = nowIso();
        let nextId = Math.max(0, ...state.bundles.flatMap((item) => item.photos.map((p) => p.id)));
        const added: MockBundlePhoto[] = sources.flatMap((source) =>
          source
            ? [
                {
                  id: (nextId += 1),
                  photoId: source.photoId,
                  imageAssetId: source.photoId + 7000,
                  imageUrl: source.imageUrl,
                  position: 0,
                  addedBy: MOCK_MY_MEMBER_ID,
                  addedAt: at,
                },
              ]
            : [],
        );
        changeBundle(bundle.id, (latest) => ({
          ...latest,
          photos: renumber([...byPosition(staying), ...added]),
        }));
        return { status: 200, body: { id: bundle.id } };
      },
    );
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    const stored = outcome.response;
    if (stored.status !== 200) return fail(stored.status, (stored.body as { code: string }).code);
    return snapshotOf(bundle.id);
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

      // 이동 대상을 뺀 순서에서 앞뒤 anchor가 존재하고 서로 인접해야 함(양쪽 null은 사진이 하나일 때만)
      const rest = byPosition(bundle.photos).filter((photo) => photo.id !== moving.id);
      const previousIndex =
        previous === null ? -1 : rest.findIndex((photo) => photo.id === previous);
      const nextIndex = next === null ? rest.length : rest.findIndex((photo) => photo.id === next);
      const anchorsExist =
        (previous === null || previousIndex >= 0) && (next === null || nextIndex >= 0);
      if (!anchorsExist || nextIndex !== previousIndex + 1) return fail(409, 'BUNDLE_006');

      const moved = [...rest.slice(0, previousIndex + 1), moving, ...rest.slice(previousIndex + 1)];
      const unchanged = moved.every(
        (photo, index) => photo.id === byPosition(bundle.photos)[index]?.id,
      );
      // 자리가 같으면 revision을 올리지 않음
      if (!unchanged) {
        changeBundle(bundle.id, (latest) => ({ ...latest, photos: renumber(moved) }));
      }
      return snapshotOf(bundle.id);
    },
  ),
];
