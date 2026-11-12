import { http } from 'msw';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { MockBundle, MockBundlePhoto, MockDbState, MockLease } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { runIdempotent } from '../lib/idempotency';

// 백엔드 명세(번들 초안 생성·수정·발행·편집권) 기준, 명세에 없는 부분은 `ponytail:`로 표시
const MAX_PHOTOS = 20;
const MAX_DRAFTS = 10;
const MIN_BUNCH_MEMBERS = 2;
const TITLE_MAX = 40;
const CAPTION_MAX = 200;
const COMMENT_MAX = 400;
// 편집권 유효 시간(마지막 갱신 후 15초, heartbeat는 5초 간격)
export const LEASE_TTL_MS = 15_000;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const length = (value: string) => [...value].length;
export const nowIso = () => new Date().toISOString();

export const readJson = async (request: Request): Promise<Record<string, unknown> | null> => {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
};

const isVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

type Scope = {
  bunchId: number;
  bundle: MockBundle;
  isCreator: boolean;
  isAdmin: boolean;
  isParticipant: boolean;
};

export type ParamValue = string | readonly string[] | undefined;

// 번치 존재(404)·내 소속(403)·번들 존재(404) 순서로 확인
export const findScope = (
  bunchIdParam: ParamValue,
  bundleIdParam: ParamValue,
): { error: Response } | Scope => {
  const bunchId = toWireId(bunchIdParam);
  const bundleId = toWireId(bundleIdParam);
  if (bunchId === undefined || bundleId === undefined) return { error: fail(400, 'COMMON_001') };
  const { bunches, memberships, bundles } = mockDb.get();
  if (!bunches.some((bunch) => bunch.id === bunchId)) return { error: fail(404, 'RESOURCE_001') };
  const mine = memberships.find(
    (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
  );
  if (!mine) return { error: fail(403, 'AUTH_002') };
  const bundle = bundles.find((item) => item.id === bundleId && item.bunchId === bunchId);
  if (!bundle) return { error: fail(404, 'RESOURCE_001') };
  return {
    bunchId,
    bundle,
    isCreator: bundle.createdBy === MOCK_MY_MEMBER_ID,
    isAdmin: mine.role !== 'MEMBER',
    isParticipant: bundle.participants.some((p) => p.memberId === MOCK_MY_MEMBER_ID),
  };
};

const publishBlockers = (bundle: MockBundle) => {
  const reasons: string[] = [];
  if (bundle.title.trim() === '') reasons.push('TITLE_REQUIRED');
  if (bundle.visibility === null) reasons.push('VISIBILITY_REQUIRED');
  if (bundle.participants.length < MIN_BUNCH_MEMBERS) reasons.push('PARTICIPANTS_REQUIRED');
  const commented = (memberId: number) =>
    bundle.comments.some((comment) => comment.memberId === memberId && comment.content.trim());
  if (!bundle.participants.every((p) => commented(p.memberId))) reasons.push('COMMENTS_REQUIRED');
  if (bundle.photos.length < 1 || bundle.photos.length > MAX_PHOTOS)
    reasons.push('PHOTOS_REQUIRED');
  return reasons;
};

export const liveLeases = (state: MockDbState, bundleId: number): MockLease[] =>
  state.bundleLeases.filter(
    (lease) => lease.bundleId === bundleId && new Date(lease.expiresAt).getTime() > Date.now(),
  );

// 날짜를 아직 고르지 않았을 때 보여 주는 추천 촬영일(사진함 원본의 촬영일, 많은 순 최대 3개)
const dateChips = (bundle: MockBundle, state: MockDbState): string[] => {
  if (bundle.date !== null) return [];
  const counts = new Map<string, number>();
  for (const bundlePhoto of bundle.photos) {
    const date = state.photos.find((photo) => photo.photoId === bundlePhoto.photoId)?.capturedDate;
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    .slice(0, 3)
    .map(([date]) => date);
};

// 번들 한 건의 응답(BundleSnapshot). 편집권 token은 공개하지 않음
export const toSnapshot = (bundle: MockBundle, state: MockDbState, myRole: string) => {
  const isCreator = bundle.createdBy === MOCK_MY_MEMBER_ID;
  const isAdmin = myRole !== 'MEMBER';
  const participant = bundle.participants.some((p) => p.memberId === MOCK_MY_MEMBER_ID);
  const draft = bundle.status === 'DRAFT';
  return {
    id: bundle.id,
    bunchId: bundle.bunchId,
    createdBy: bundle.createdBy,
    status: bundle.status,
    title: bundle.title,
    titleVersion: bundle.titleVersion,
    visibility: bundle.visibility,
    visibilityVersion: bundle.visibilityVersion,
    date: bundle.date,
    dateVersion: bundle.dateVersion,
    // 위치 저장은 가짜 서버가 단순화한 구현(편집권 LOCATION은 가짜 서버 확장). 응답 모양은 BundleSnapshot 계약을 따름
    locationVersion: bundle.locationsVersion,
    locations: bundle.locations.map((location, index) => ({
      ...location,
      id: index + 1,
      position: index,
    })),
    likeCount: 0,
    likedByCurrentBunch: false,
    commentCount: 0,
    revision: bundle.revision,
    photos: [...bundle.photos].sort((a, b) => a.position - b.position),
    participants: [...bundle.participants]
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
      .map((participant) => ({ ...participant, profileAvailable: true })),
    comments: bundle.comments.map((comment, index) => ({
      ...comment,
      id: index + 1,
      profileAvailable: true,
    })),
    dateChips: dateChips(bundle, state),
    publishBlockers: draft ? publishBlockers(bundle) : [],
    permissions: {
      administrator: isAdmin,
      creator: isCreator,
      participant,
      canEdit: draft ? participant : isCreator || isAdmin,
      canPublish: draft && participant && (isCreator || isAdmin),
      canDelete: draft && (isCreator || isAdmin),
      // 번들 상세 명세: 신고는 내 번치의 OWNER 관리 대상이 아닐 때, 좋아요·댓글은 번치가 있을 때 허용(초안의 소셜 값은 false로 둠)
      canReport: !draft && myRole !== 'OWNER',
      canLike: !draft,
      canComment: !draft,
    },
    leases: draft
      ? liveLeases(state, bundle.id).map(({ target, memberId, leaseVersion, expiresAt }) => ({
          target,
          memberId,
          leaseVersion,
          expiresAt,
        }))
      : [],
    createdAt: bundle.createdAt,
    updatedAt: bundle.updatedAt,
    publishedAt: bundle.publishedAt,
  };
};

export const myRoleIn = (state: MockDbState, bunchId: number) =>
  state.memberships.find(
    (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
  )?.role ?? 'MEMBER';

export const snapshotOf = (bundleId: number) => {
  const state = mockDb.get();
  const bundle = state.bundles.find((item) => item.id === bundleId);
  if (!bundle) return fail(404, 'RESOURCE_001');
  return ok(toSnapshot(bundle, state, myRoleIn(state, bundle.bunchId)));
};

// 번들 한 건을 고치고 내용이 바뀌었으니 revision·updatedAt을 올림(편집 변경은 모두 이 함수로 반영)
export const changeBundle = (bundleId: number, change: (_bundle: MockBundle) => MockBundle) =>
  mockDb.update((current) => ({
    ...current,
    bundles: current.bundles.map((bundle) =>
      bundle.id === bundleId
        ? { ...change(bundle), revision: bundle.revision + 1, updatedAt: nowIso() }
        : bundle,
    ),
  }));

type SaveKind = 'title' | 'visibility' | 'comment' | 'caption' | 'date';

const textOk = (value: unknown, max: number): value is string =>
  typeof value === 'string' && length(value) <= max;

const setPhoto = (
  bundle: MockBundle,
  bundlePhotoId: number,
  change: (_photo: MockBundlePhoto) => MockBundlePhoto,
): MockBundle => ({
  ...bundle,
  photos: bundle.photos.map((photo) => (photo.id === bundlePhotoId ? change(photo) : photo)),
});

type SaveRequest = {
  kind: SaveKind;
  params: Record<string, ParamValue>;
  request: Request;
};

// 필드 저장 공통 규칙: 모드·권한·편집권·길이·버전을 확인하고 같은 값이면 아무것도 바꾸지 않음
const saveField = async ({ kind, params, request }: SaveRequest) => {
  const scope = findScope(params.bunchId, params.id);
  if ('error' in scope) return scope.error;
  const { bundle, isCreator, isAdmin, isParticipant } = scope;
  const body = await readJson(request);
  if (!body) return fail(400, 'COMMON_001');
  const { expectedVersion, mode, leaseToken } = body;
  // 날짜는 value를 생략하면 해제(null)
  const value = kind === 'date' && body.value === undefined ? null : body.value;
  const bundlePhotoId = kind === 'caption' ? toWireId(params.photoId) : undefined;
  if (
    !isVersion(expectedVersion) ||
    (mode !== 'DRAFT' && mode !== 'PUBLISHED') ||
    (kind === 'caption' && bundlePhotoId === undefined) ||
    (leaseToken != null && (typeof leaseToken !== 'string' || !UUID.test(leaseToken)))
  ) {
    return fail(400, 'COMMON_001');
  }
  // 서버 상태와 다른 모드(발행 뒤 늦게 도착한 초안 저장 등)
  if (mode !== bundle.status) return fail(409, 'BUNDLE_002');

  // 초안은 참여자만, 발행본의 공용 내용은 생성자·관리자만, 코멘트는 어느 쪽이든 참여자 본인만
  const allowed =
    kind === 'comment' || bundle.status === 'DRAFT' ? isParticipant : isCreator || isAdmin;
  if (!allowed) return fail(403, 'AUTH_002');

  const state = mockDb.get();
  // 제목·날짜·사진 캡션의 초안 저장은 편집권 token이 현재 내 것이어야 함
  const leaseTarget =
    kind === 'title'
      ? 'TITLE'
      : kind === 'date'
        ? 'DATE'
        : kind === 'caption'
          ? `PHOTO:${bundlePhotoId}`
          : null;
  if (bundle.status === 'DRAFT' && leaseTarget !== null) {
    const held = liveLeases(state, bundle.id).find((lease) => lease.target === leaseTarget);
    if (!held || held.memberId !== MOCK_MY_MEMBER_ID || held.token !== leaseToken) {
      return fail(409, 'BUNDLE_004');
    }
  }

  if (kind === 'caption' && !bundle.photos.some((photo) => photo.id === bundlePhotoId)) {
    return fail(404, 'RESOURCE_001');
  }

  const published = bundle.status === 'PUBLISHED';
  const myComment = bundle.comments.find((comment) => comment.memberId === MOCK_MY_MEMBER_ID);
  const photo = bundle.photos.find((item) => item.id === bundlePhotoId);

  let currentValue: unknown;
  let currentVersion: number;
  let valid: boolean;
  switch (kind) {
    case 'title':
      currentValue = bundle.title;
      currentVersion = bundle.titleVersion;
      // 제목은 trim·한 줄, 초안은 빈 제목 허용 발행본은 불가
      valid =
        textOk(value, TITLE_MAX) && !/[\r\n]/.test(value) && (!published || value.trim() !== '');
      break;
    case 'visibility':
      currentValue = bundle.visibility;
      currentVersion = bundle.visibilityVersion;
      valid = value === 'PUBLIC' || value === 'PRIVATE';
      break;
    case 'date':
      currentValue = bundle.date;
      currentVersion = bundle.dateVersion;
      valid = value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
      break;
    case 'caption':
      currentValue = photo?.caption ?? '';
      currentVersion = photo?.captionVersion ?? 0;
      valid = textOk(value, CAPTION_MAX);
      break;
    default:
      currentValue = myComment?.content ?? '';
      currentVersion = myComment?.version ?? 0;
      valid = textOk(value, COMMENT_MAX) && (!published || value.trim() !== '');
  }
  if (!valid) return fail(400, 'COMMON_001');

  if (expectedVersion !== currentVersion) {
    return fail(409, 'BUNDLE_003', {
      value: currentValue as string | null,
      version: currentVersion,
      ...(bundlePhotoId === undefined ? {} : { bundlePhotoId }),
    });
  }
  const normalized = typeof value === 'string' && kind !== 'comment' ? value.trim() : value;
  if (normalized === currentValue) return snapshotOf(bundle.id);

  const at = nowIso();
  changeBundle(bundle.id, (current) => {
    switch (kind) {
      case 'title':
        return { ...current, title: normalized as string, titleVersion: current.titleVersion + 1 };
      case 'visibility':
        return {
          ...current,
          visibility: normalized as 'PUBLIC' | 'PRIVATE',
          visibilityVersion: current.visibilityVersion + 1,
        };
      case 'date':
        return {
          ...current,
          date: normalized as string | null,
          dateVersion: current.dateVersion + 1,
        };
      case 'caption':
        return setPhoto(current, bundlePhotoId as number, (item) => ({
          ...item,
          caption: normalized as string,
          captionVersion: item.captionVersion + 1,
          captionUpdatedBy: MOCK_MY_MEMBER_ID,
          captionUpdatedAt: at,
        }));
      default: {
        const row = current.comments.find((comment) => comment.memberId === MOCK_MY_MEMBER_ID);
        return {
          ...current,
          comments: row
            ? current.comments.map((comment) =>
                comment === row
                  ? {
                      ...row,
                      content: normalized as string,
                      version: row.version + 1,
                      updatedAt: at,
                    }
                  : comment,
              )
            : [
                ...current.comments,
                {
                  memberId: MOCK_MY_MEMBER_ID,
                  content: normalized as string,
                  version: 1,
                  createdAt: at,
                  updatedAt: at,
                },
              ],
        };
      }
    }
  });
  return snapshotOf(bundle.id);
};

const isPhotoIdList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0);

export const bundleHandlers = [
  // POST /api/v1/bunches/{bunchId}/bundles
  // 같은 번치 사진 1~20장으로 초안 생성. 생성자와 고른 사진을 올린 현재 멤버가 초기 참여자(생성자 먼저)
  http.post('/api/bunches/:bunchId/bundles', async ({ params, request }) => {
    const bunchId = toWireId(params.bunchId);
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    const body = await readJson(request);
    const photoIds = body?.photoIds;
    if (
      bunchId === undefined ||
      !key ||
      !UUID.test(key) ||
      !isPhotoIdList(photoIds) ||
      photoIds.length < 1 ||
      photoIds.length > MAX_PHOTOS ||
      new Set(photoIds).size !== photoIds.length
    ) {
      return fail(400, 'COMMON_001');
    }
    const state = mockDb.get();
    if (!state.bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    const bunchMemberIds = state.memberships
      .filter((membership) => membership.bunchId === bunchId)
      .map((membership) => membership.memberId);
    if (!bunchMemberIds.includes(MOCK_MY_MEMBER_ID)) return fail(403, 'AUTH_002');

    const outcome = runIdempotent(
      `${MOCK_MY_MEMBER_ID}:${bunchId}:create`,
      key,
      JSON.stringify(photoIds),
      () => {
        const current = mockDb.get();
        if (
          bunchMemberIds.length < MIN_BUNCH_MEMBERS ||
          current.bundles.filter(
            (bundle) => bundle.bunchId === bunchId && bundle.status === 'DRAFT',
          ).length >= MAX_DRAFTS
        ) {
          return { status: 409, body: { code: 'BUNDLE_001' } };
        }
        // 사진 누락·다른 번치 사진이 하나라도 있으면 전체 거부
        const picked = photoIds.map((id) =>
          current.photos.find((photo) => photo.bunchId === bunchId && photo.photoId === id),
        );
        if (picked.some((photo) => photo === undefined)) {
          return { status: 404, body: { code: 'RESOURCE_001' } };
        }
        const at = nowIso();
        const id = Math.max(0, ...current.bundles.map((bundle) => bundle.id)) + 1;
        let nextPhotoId = Math.max(0, ...current.bundles.flatMap((b) => b.photos.map((p) => p.id)));
        const photos: MockBundlePhoto[] = picked.flatMap((photo, position) =>
          photo
            ? [
                {
                  id: (nextPhotoId += 1),
                  photoId: photo.photoId,
                  imageAssetId: photo.photoId + 7000,
                  imageUrl: photo.imageUrl,
                  position,
                  addedBy: MOCK_MY_MEMBER_ID,
                  addedAt: at,
                  caption: '',
                  captionVersion: 0,
                  captionUpdatedBy: null,
                  captionUpdatedAt: null,
                },
              ]
            : [],
        );
        const uploaderIds = picked.flatMap((photo) => photo?.uploaderIds ?? []);
        const participantIds = [
          MOCK_MY_MEMBER_ID,
          ...[...new Set(uploaderIds)].filter(
            (memberId) => memberId !== MOCK_MY_MEMBER_ID && bunchMemberIds.includes(memberId),
          ),
        ];
        const bundle: MockBundle = {
          id,
          bunchId,
          createdBy: MOCK_MY_MEMBER_ID,
          status: 'DRAFT',
          title: '',
          titleVersion: 0,
          visibility: null,
          visibilityVersion: 0,
          date: null,
          dateVersion: 0,
          locations: [],
          locationsVersion: 0,
          revision: 1,
          photos,
          participants: participantIds.map((memberId) => ({ memberId, joinedAt: at })),
          comments: [],
          createdAt: at,
          updatedAt: at,
          publishedAt: null,
        };
        mockDb.update((latest) => ({ ...latest, bundles: [...latest.bundles, bundle] }));
        return { status: 200, body: { id } };
      },
    );
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    const stored = outcome.response;
    if (stored.status !== 200) {
      return fail(stored.status, (stored.body as { code: string }).code);
    }
    return snapshotOf((stored.body as { id: number }).id);
  }),

  // GET /api/v1/bunches/{bunchId}/bundles/{id}
  // 번치 멤버라면 참여자가 아니어도 볼 수 있음(보기 전용, 권한 값으로 구분)
  http.get('/api/bunches/:bunchId/bundles/:id', ({ params }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    return snapshotOf(scope.bundle.id);
  }),

  // PUT …/title · visibility · date · comments/me · photos/{photoId}/caption
  http.put('/api/bunches/:bunchId/bundles/:id/title', ({ params, request }) =>
    saveField({ kind: 'title', params, request }),
  ),
  http.put('/api/bunches/:bunchId/bundles/:id/visibility', ({ params, request }) =>
    saveField({ kind: 'visibility', params, request }),
  ),
  http.put('/api/bunches/:bunchId/bundles/:id/date', ({ params, request }) =>
    saveField({ kind: 'date', params, request }),
  ),
  http.put('/api/bunches/:bunchId/bundles/:id/comments/me', ({ params, request }) =>
    saveField({ kind: 'comment', params, request }),
  ),
  http.put('/api/bunches/:bunchId/bundles/:id/photos/:photoId/caption', ({ params, request }) =>
    saveField({ kind: 'caption', params, request }),
  ),

  // POST /api/v1/bunches/{bunchId}/bundles/{id}/participants
  http.post('/api/bunches/:bunchId/bundles/:id/participants', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bundle, bunchId, isParticipant } = scope;
    const memberId = (await readJson(request))?.memberId;
    if (typeof memberId !== 'number' || !Number.isSafeInteger(memberId) || memberId < 1) {
      return fail(400, 'COMMON_001');
    }
    if (bundle.status === 'PUBLISHED') return fail(409, 'BUNDLE_002');
    // 초안 참여자만 호출, 비참여자는 자신도 참여시킬 수 없음
    if (!isParticipant) return fail(403, 'AUTH_002');
    const state = mockDb.get();
    if (
      !state.memberships.some(
        (membership) => membership.bunchId === bunchId && membership.memberId === memberId,
      )
    ) {
      return fail(400, 'COMMON_001');
    }
    if (bundle.participants.some((p) => p.memberId === memberId)) return snapshotOf(bundle.id);
    const at = nowIso();
    changeBundle(bundle.id, (current) => ({
      ...current,
      participants: [...current.participants, { memberId, joinedAt: at }],
      // 새 참여자의 빈 코멘트 row, 버전은 추가 전 revision + 1
      comments: [
        ...current.comments,
        {
          memberId,
          content: '',
          version: current.revision + 1,
          createdAt: at,
          updatedAt: at,
        },
      ],
    }));
    return snapshotOf(bundle.id);
  }),

  // DELETE /api/v1/bunches/{bunchId}/bundles/{id}/participants/{memberId}
  http.delete('/api/bunches/:bunchId/bundles/:id/participants/:memberId', ({ params }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bundle, isCreator, isAdmin, isParticipant } = scope;
    const memberId = toWireId(params.memberId);
    if (memberId === undefined) return fail(400, 'COMMON_001');
    if (bundle.status === 'PUBLISHED') return fail(409, 'BUNDLE_002');
    // 호출자도 참여자이면서 생성자나 관리자여야 하고, 생성자는 제외할 수 없음
    if (!isParticipant || !(isCreator || isAdmin)) return fail(403, 'AUTH_002');
    if (memberId === bundle.createdBy) return fail(403, 'AUTH_002');
    if (!bundle.participants.some((p) => p.memberId === memberId)) return fail(404, 'RESOURCE_001');
    changeBundle(bundle.id, (current) => ({
      ...current,
      participants: current.participants.filter((p) => p.memberId !== memberId),
      // 제외되는 멤버의 코멘트를 함께 지움
      comments: current.comments.filter((comment) => comment.memberId !== memberId),
    }));
    mockDb.update((current) => ({
      ...current,
      bundleLeases: current.bundleLeases.filter(
        (lease) => !(lease.bundleId === bundle.id && lease.memberId === memberId),
      ),
    }));
    return snapshotOf(bundle.id);
  }),

  // POST /api/v1/bunches/{bunchId}/bundles/{id}/publish
  http.post('/api/bunches/:bunchId/bundles/:id/publish', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bundle, bunchId, isCreator, isAdmin, isParticipant } = scope;
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    const expectedRevision = (await readJson(request))?.expectedRevision;
    if (!key || !UUID.test(key) || !isVersion(expectedRevision)) return fail(400, 'COMMON_001');

    const outcome = runIdempotent(
      `${MOCK_MY_MEMBER_ID}:${bunchId}:publish:${bundle.id}`,
      key,
      String(expectedRevision),
      () => {
        const current = mockDb.get().bundles.find((item) => item.id === bundle.id);
        if (!current) return { status: 404, body: { code: 'RESOURCE_001' } };
        // 생성자 또는 관리자만, 초안에서는 호출자도 참여자여야 함
        if (!(isCreator || isAdmin) || !isParticipant) {
          return { status: 403, body: { code: 'AUTH_002' } };
        }
        if (current.status === 'PUBLISHED') return { status: 409, body: { code: 'BUNDLE_002' } };
        if (current.revision !== expectedRevision) {
          return {
            status: 409,
            body: { code: 'BUNDLE_003', detail: { revision: current.revision } },
          };
        }
        const reasons = publishBlockers(current);
        if (reasons.length > 0) {
          return { status: 409, body: { code: 'BUNDLE_005', detail: { reasons } } };
        }
        changeBundle(bundle.id, (latest) => ({
          ...latest,
          status: 'PUBLISHED',
          publishedAt: nowIso(),
        }));
        // 발행하면 활성 편집권을 모두 풂
        mockDb.update((latest) => ({
          ...latest,
          bundleLeases: latest.bundleLeases.filter((lease) => lease.bundleId !== bundle.id),
        }));
        return { status: 200, body: { id: bundle.id } };
      },
    );
    if (outcome.kind === 'conflict') return fail(409, 'REQUEST_001');
    const stored = outcome.response;
    if (stored.status !== 200) {
      const error = stored.body as { code: string; detail?: Record<string, unknown> };
      return fail(stored.status, error.code, (error.detail ?? null) as never);
    }
    return snapshotOf(bundle.id);
  }),
];
