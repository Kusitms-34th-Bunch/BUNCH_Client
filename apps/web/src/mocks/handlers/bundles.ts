import { http } from 'msw';
import { countTitleGraphemes, displayTitle } from '@/features/bundle/lib/title';
import {
  createTitleDoc,
  editTitle,
  ensureTitleCrdt,
  loadTitleDoc,
  mergeTitleDocs,
  saveTitleDoc,
  titleText,
} from '@/features/bundle/lib/titleCrdt';
import { IDEMPOTENCY_KEY_HEADER } from '@/shared/api/idempotencyKey';
import { toWireId } from '@/shared/api/ids';
import type { MockBundle, MockBundlePhoto, MockDbState, MockLocation } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';
import { runIdempotent } from '../lib/idempotency';
import { findMockRecommendationTitle } from './recommendations';

// 백엔드 명세(번들 초안 생성·수정·발행) 기준, 명세에 없는 부분은 `ponytail:`로 표시
const MAX_PHOTOS = 20;
const MAX_DRAFTS = 10;
const MIN_BUNCH_MEMBERS = 2;
const TITLE_MAX = 40;
const COMMENT_MAX = 400;
// 제목에는 줄바꿈과 NUL을 넣을 수 없음(CR, LF, U+0085, U+2028, U+2029, NUL)
const INVALID_TITLE_CODES = [0x0d, 0x0a, 0x85, 0x2028, 0x2029, 0x00];
const hasInvalidTitleChar = (text: string) =>
  INVALID_TITLE_CODES.some((code) => text.includes(String.fromCharCode(code)));
// 디코딩 후 256KiB를 base64 길이로 환산한 상한
const CRDT_MAX_BASE64 = Math.ceil((256 * 1024 * 4) / 3) + 4;
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

// 발행 준비 snapshot의 publishBlockers에는 공개 범위를 넣지 않고(finalVisibility 생략), 최종 발행 요청에서만 범위를 확인함
const publishBlockers = (bundle: MockBundle, finalVisibility?: 'PUBLIC' | 'PRIVATE' | null) => {
  const reasons: string[] = [];
  if (bundle.title.trim() === '') reasons.push('TITLE_REQUIRED');
  if (countTitleGraphemes(bundle.title) > TITLE_MAX) reasons.push('TITLE_TOO_LONG');
  if (finalVisibility === null) reasons.push('VISIBILITY_REQUIRED');
  if (bundle.participants.length < MIN_BUNCH_MEMBERS) reasons.push('PARTICIPANTS_REQUIRED');
  const commented = (memberId: number) =>
    bundle.comments.some((comment) => comment.memberId === memberId && comment.content.trim());
  if (!bundle.participants.every((p) => commented(p.memberId))) reasons.push('COMMENTS_REQUIRED');
  if (bundle.photos.length < 1 || bundle.photos.length > MAX_PHOTOS)
    reasons.push('PHOTOS_REQUIRED');
  return reasons;
};

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

const participantsOf = (bundle: MockBundle) =>
  [...bundle.participants]
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    .map((participant) => ({
      ...participant,
      profileAvailable: true,
      creator: participant.memberId === bundle.createdBy,
    }));

// 사진 하나의 픽 요약(내 기준): 내 본인 행 버전(행이 없으면 초기 버전 0), 픽한 참여자는 참여 순서
// ponytail: 참여자 추가 시 pickInitialVersion(추가 시점 revision)은 가짜 서버가 단순화해 항상 0
const photoPicks = (bundle: MockBundle, bundlePhotoId: number) => {
  const rows = bundle.photos.find((photo) => photo.id === bundlePhotoId)?.picks ?? [];
  const members = participantsOf(bundle).filter((participant) =>
    rows.some((row) => row.memberId === participant.memberId && row.picked),
  );
  const mine = rows.find((row) => row.memberId === MOCK_MY_MEMBER_ID);
  return {
    count: members.length,
    pickedByMe: mine?.picked ?? false,
    version: mine?.version ?? 0,
    members,
  };
};

const MAX_LOCATIONS = 3;

type IntentPlace = { provider: string; externalId: string; name: string; address: string | null };

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const toPlace = (value: unknown): IntentPlace | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const place = value as Record<string, unknown>;
  const address = place.address ?? null;
  if (!isText(place.provider) || !isText(place.externalId) || !isText(place.name)) return undefined;
  // 주소 없음은 null만 허용하고 빈 문자열·공백은 거부
  if (address !== null && !isText(address)) return undefined;
  return { provider: place.provider, externalId: place.externalId, name: place.name, address };
};

const isLocationId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

type LocationIntent =
  | { intent: 'ADD'; locations: IntentPlace[] }
  | { intent: 'REPLACE'; targetLocationId: number; location: IntentPlace }
  | { intent: 'REMOVE'; targetLocationId: number }
  | {
      intent: 'MOVE';
      targetLocationId: number;
      previousLocationId: number | null;
      nextLocationId: number | null;
    };

const hasOnly = (body: Record<string, unknown>, allowed: string[]) =>
  Object.keys(body).every((key) => allowed.includes(key));

const parseLocationIntent = (body: Record<string, unknown> | null): LocationIntent | undefined => {
  if (!body) return undefined;
  switch (body.intent) {
    case 'ADD': {
      if (!hasOnly(body, ['intent', 'locations']) || !Array.isArray(body.locations))
        return undefined;
      const places = body.locations.map(toPlace);
      return places.length >= 1 && places.length <= MAX_LOCATIONS && places.every(Boolean)
        ? { intent: 'ADD', locations: places as IntentPlace[] }
        : undefined;
    }
    case 'REPLACE': {
      if (!hasOnly(body, ['intent', 'location', 'targetLocationId'])) return undefined;
      const location = toPlace(body.location);
      return location && isLocationId(body.targetLocationId)
        ? { intent: 'REPLACE', targetLocationId: body.targetLocationId, location }
        : undefined;
    }
    case 'REMOVE':
      return hasOnly(body, ['intent', 'targetLocationId']) && isLocationId(body.targetLocationId)
        ? { intent: 'REMOVE', targetLocationId: body.targetLocationId }
        : undefined;
    case 'MOVE': {
      if (!hasOnly(body, ['intent', 'targetLocationId', 'previousLocationId', 'nextLocationId'])) {
        return undefined;
      }
      const optional = (value: unknown) => (value === undefined || value === null ? null : value);
      const previous = optional(body.previousLocationId);
      const next = optional(body.nextLocationId);
      return isLocationId(body.targetLocationId) &&
        (previous === null || isLocationId(previous)) &&
        (next === null || isLocationId(next))
        ? {
            intent: 'MOVE',
            targetLocationId: body.targetLocationId,
            previousLocationId: previous,
            nextLocationId: next,
          }
        : undefined;
    }
    default:
      return undefined;
  }
};

// 장소 행 id를 모두 채운 목록(시드처럼 id가 없는 줄은 순서로 정함)
const locationsWithIds = (bundle: MockBundle): (MockLocation & { id: number })[] =>
  bundle.locations.map((location, index) => ({ ...location, id: location.id ?? index + 1 }));

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
    titleTooLong: countTitleGraphemes(bundle.title) > TITLE_MAX,
    // 발행본에는 CRDT 문서가 없음
    titleCrdtState: draft ? bundle.titleCrdtState : undefined,
    visibility: bundle.visibility,
    visibilityVersion: bundle.visibilityVersion,
    date: bundle.date,
    dateVersion: bundle.dateVersion,
    // 위치 저장은 가짜 서버가 단순화한 구현(편집권 LOCATION은 가짜 서버 확장). 응답 모양은 BundleSnapshot 계약을 따름
    locationVersion: bundle.locationsVersion,
    locations: bundle.locations.map((location, index) => ({
      ...location,
      id: location.id ?? index + 1,
      position: index,
    })),
    likeCount: 0,
    likedByCurrentBunch: false,
    commentCount: 0,
    revision: bundle.revision,
    photos: [...bundle.photos]
      .sort((a, b) => a.position - b.position)
      .map(({ picks: _rows, ...photo }) => ({ ...photo, picks: photoPicks(bundle, photo.id) })),
    participants: participantsOf(bundle),
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
    createdAt: bundle.createdAt,
    updatedAt: bundle.updatedAt,
    publishedAt: bundle.publishedAt,
    // 발행본이면 발행자(가짜 서버는 생성자로 둠)
    ...(draft
      ? {}
      : {
          publishedBy: bundle.createdBy,
          publisherNickname: state.members.find((member) => member.memberId === bundle.createdBy)
            ?.nickname,
        }),
  };
};

export const myRoleIn = (state: MockDbState, bunchId: number) =>
  state.memberships.find(
    (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
  )?.role ?? 'MEMBER';

/** 번들 응답(BundleSnapshot). extra는 요청자에게만 가는 필드(사진 구성 변경의 photoChangeResult) */
export const snapshotOf = (bundleId: number, extra: Record<string, unknown> = {}) => {
  const state = mockDb.get();
  const bundle = state.bundles.find((item) => item.id === bundleId);
  if (!bundle) return fail(404, 'RESOURCE_001');
  return ok({ ...toSnapshot(bundle, state, myRoleIn(state, bundle.bunchId)), ...extra });
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

/** 번들에 제목 CRDT 문서가 없으면 제목으로 만들어 둠(snapshot이 문서를 싣도록 snapshot 전에 부름) */
const ensureTitleState = async (bundleId: number) => {
  await ensureTitleCrdt();
  const found = mockDb.get().bundles.find((item) => item.id === bundleId);
  if (!found || found.titleCrdtState !== undefined) return;
  const state = saveTitleDoc(createTitleDoc(found.title));
  mockDb.update((current) => ({
    ...current,
    bundles: current.bundles.map((item) =>
      item.id === bundleId ? { ...item, titleCrdtState: state } : item,
    ),
  }));
};

type SaveKind = 'title' | 'visibility' | 'comment' | 'date';

const textOk = (value: unknown, max: number): value is string =>
  typeof value === 'string' && length(value) <= max;

type SaveRequest = {
  kind: SaveKind;
  params: Record<string, ParamValue>;
  request: Request;
};

// 필드 저장 공통 규칙: 모드·권한·길이·버전을 확인하고 같은 값이면 아무것도 바꾸지 않음
const saveField = async ({ kind, params, request }: SaveRequest) => {
  const scope = findScope(params.bunchId, params.id);
  if ('error' in scope) return scope.error;
  const { bundle, isCreator, isAdmin, isParticipant } = scope;
  const body = await readJson(request);
  if (!body) return fail(400, 'COMMON_001');
  const { expectedVersion, mode } = body;
  // 날짜는 value를 생략하면 해제(null)
  const value = kind === 'date' && body.value === undefined ? null : body.value;
  if (!isVersion(expectedVersion) || (mode !== 'DRAFT' && mode !== 'PUBLISHED')) {
    return fail(400, 'COMMON_001');
  }
  // 서버 상태와 다른 모드(발행 뒤 늦게 도착한 초안 저장 등)
  if (mode !== bundle.status) return fail(409, 'BUNDLE_002');

  // 초안은 참여자만, 발행본의 공용 내용은 생성자·관리자만, 코멘트는 어느 쪽이든 참여자 본인만
  const allowed =
    kind === 'comment' || bundle.status === 'DRAFT' ? isParticipant : isCreator || isAdmin;
  if (!allowed) return fail(403, 'AUTH_002');

  const published = bundle.status === 'PUBLISHED';
  const myComment = bundle.comments.find((comment) => comment.memberId === MOCK_MY_MEMBER_ID);

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
    default:
      currentValue = myComment?.content ?? '';
      currentVersion = myComment?.version ?? 0;
      valid = textOk(value, COMMENT_MAX) && (!published || value.trim() !== '');
  }
  if (!valid) return fail(400, 'COMMON_001');

  // 날짜는 v5 명세가 낡은 버전도 거절하지 않고 마지막 저장을 적용함(expectedVersion은 호환 필드)
  if (kind !== 'date' && expectedVersion !== currentVersion) {
    return fail(409, 'BUNDLE_003', {
      value: currentValue as string | null,
      version: currentVersion,
    });
  }
  const normalized = typeof value === 'string' && kind !== 'comment' ? value.trim() : value;
  if (normalized === currentValue) return snapshotOf(bundle.id);
  // 문서가 없는 기존 번들의 제목을 바꿀 때 WASM 로드와 문서 생성을 기다림
  if (kind === 'title') await ensureTitleState(bundle.id);

  const at = nowIso();
  changeBundle(bundle.id, (current) => {
    switch (kind) {
      case 'title': {
        // 이전 전체 문자열 경로도 CRDT 문서를 이어서 고쳐 문서와 제목이 어긋나지 않게 함
        const doc = current.titleCrdtState
          ? editTitle(loadTitleDoc(current.titleCrdtState), normalized as string)
          : createTitleDoc(normalized as string);
        return {
          ...current,
          title: normalized as string,
          titleVersion: current.titleVersion + 1,
          titleCrdtState: saveTitleDoc(doc),
        };
      }
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

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const isPhotoIdList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0);

export const bundleHandlers = [
  // POST /api/v1/bunches/{bunchId}/bundles
  // 같은 번치 사진 1~20장으로 초안 생성. 생성자와 고른 참여 멤버(participantMemberIds, 1명 이상, 나 제외)가 초기 참여자(생성자 먼저)
  // 사진을 올렸다는 이유로 자동 참여하지 않음. 사진이 사라졌으면 PHOTO_004(detail.missingPhotoIds), 유효하지 않은 멤버가 하나라도 있으면 전체 거부
  http.post('/api/bunches/:bunchId/bundles', async ({ params, request }) => {
    const bunchId = toWireId(params.bunchId);
    const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);
    const body = await readJson(request);
    const photoIds = body?.photoIds;
    const participantIds = body?.participantMemberIds;
    // 선택 입력: 마지막으로 적용한 추천 번들 id(없으면 null)
    const recommendationId = body?.recommendationId ?? null;
    if (
      bunchId === undefined ||
      !key ||
      !UUID.test(key) ||
      !isPhotoIdList(photoIds) ||
      photoIds.length < 1 ||
      photoIds.length > MAX_PHOTOS ||
      new Set(photoIds).size !== photoIds.length ||
      !isPhotoIdList(participantIds) ||
      participantIds.length < 1 ||
      new Set(participantIds).size !== participantIds.length ||
      participantIds.includes(MOCK_MY_MEMBER_ID) ||
      (recommendationId !== null && !isPositiveInt(recommendationId))
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
      JSON.stringify({ photoIds, participantMemberIds: participantIds, recommendationId }),
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
        // 선택한 멤버가 현재 번치 멤버가 아니면 자동으로 빼지 않고 전체 거부
        if (participantIds.some((memberId) => !bunchMemberIds.includes(memberId))) {
          return { status: 400, body: { code: 'COMMON_001' } };
        }
        // 사진 누락이 하나라도 있으면 전체 거부하고 없는 사진을 알려 줌
        const picked = photoIds.map((id) =>
          current.photos.find((photo) => photo.bunchId === bunchId && photo.photoId === id),
        );
        // 어느 번치에도 없는 사진만 PHOTO_004, 있지만 다른 번치 사진이면 COMMON_001(v5 명세)
        const missingPhotoIds = photoIds.filter(
          (id) => !current.photos.some((photo) => photo.photoId === id),
        );
        if (missingPhotoIds.length > 0) {
          return { status: 409, body: { code: 'PHOTO_004', detail: { missingPhotoIds } } };
        }
        if (picked.some((photo) => photo === undefined)) {
          return { status: 400, body: { code: 'COMMON_001' } };
        }
        // 연결한 추천 번들이 있으면 기본 제목이 추천 제목. 없는 추천 ID는 실서버처럼 거절하지 않고 연결 없이 만듦(제목 비어 있음)
        const recommendationTitle =
          recommendationId === null
            ? undefined
            : findMockRecommendationTitle(bunchId, recommendationId);
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
                },
              ]
            : [],
        );
        const initialParticipantIds = [MOCK_MY_MEMBER_ID, ...participantIds];
        const bundle: MockBundle = {
          id,
          bunchId,
          createdBy: MOCK_MY_MEMBER_ID,
          status: 'DRAFT',
          title: recommendationTitle ?? '',
          titleVersion: recommendationTitle === undefined ? 0 : 1,
          visibility: null,
          visibilityVersion: 0,
          date: null,
          dateVersion: 0,
          locations: [],
          locationsVersion: 0,
          revision: 1,
          photos,
          participants: initialParticipantIds.map((memberId) => ({ memberId, joinedAt: at })),
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
      const { code, detail } = stored.body as { code: string; detail?: Record<string, unknown> };
      return detail === undefined ? fail(stored.status, code) : fail(stored.status, code, detail);
    }
    const createdId = (stored.body as { id: number }).id;
    await ensureTitleState(createdId);
    return snapshotOf(createdId);
  }),

  // GET /api/v1/bunches/{bunchId}/bundles/{id}
  // 번치 멤버라면 참여자가 아니어도 볼 수 있음(보기 전용, 권한 값으로 구분)
  http.get('/api/bunches/:bunchId/bundles/:id', async ({ params }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    await ensureTitleState(scope.bundle.id);
    return snapshotOf(scope.bundle.id);
  }),

  // POST …/locations/intents: 장소 추가·교체·삭제·이동을 서버 최신 목록에 적용(전체 덮어쓰기·버전 검사 없음)
  // 거절은 409와 detail.reason(LOCATION_DUPLICATE·LOCATION_CAPACITY_EXCEEDED·LOCATION_REMOVED)
  // 명세 7절: 409 BUNDLE_002(발행된 번들)이거나 detail.reason으로 구분한 장소 충돌. 화면은 409의 detail.reason만 읽음
  http.post('/api/bunches/:bunchId/bundles/:id/locations/intents', async ({ params, request }) => {
    const body = await readJson(request);
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bundle, isParticipant } = scope;
    if (!isParticipant) return fail(403, 'AUTH_002');
    if (bundle.status !== 'DRAFT') return fail(409, 'BUNDLE_002');
    const reject = (reason: string) => fail(409, 'BUNDLE_002', { reason });

    const parsed = parseLocationIntent(body);
    if (!parsed) return fail(400, 'COMMON_001');

    const current = locationsWithIds(bundle);
    let next = current;
    let acceptedCount = 0;
    // 지운 줄의 id를 새 줄이 이어받으면 늦게 도착한 옛 요청이 새 줄을 지우거나 바꾸므로, 발급한 id는 되풀이하지 않음
    let nextId =
      Math.max(bundle.lastLocationId ?? 0, ...current.map((location) => location.id)) + 1;
    const keyOf = (place: { provider: string; externalId: string }) =>
      `${place.provider.trim().toLowerCase()}:${place.externalId.trim()}`;

    switch (parsed.intent) {
      case 'ADD': {
        const keys = new Set(current.map(keyOf));
        for (const place of parsed.locations) {
          if (keys.has(keyOf(place))) return reject('LOCATION_DUPLICATE');
          keys.add(keyOf(place));
        }
        if (current.length + parsed.locations.length > MAX_LOCATIONS) {
          return reject('LOCATION_CAPACITY_EXCEEDED');
        }
        next = [...current, ...parsed.locations.map((place) => ({ ...place, id: nextId++ }))];
        acceptedCount = parsed.locations.length;
        break;
      }
      case 'REPLACE': {
        const target = current.find((location) => location.id === parsed.targetLocationId);
        if (
          current.some(
            (location) => location !== target && keyOf(location) === keyOf(parsed.location),
          )
        ) {
          return reject('LOCATION_DUPLICATE');
        }
        if (target) {
          next = current.map((location) =>
            location === target ? { ...parsed.location, id: target.id } : location,
          );
        } else {
          // 이미 삭제된 줄을 바꾸면 정원이 남을 때 새 줄을 맨 끝에 더함
          if (current.length >= MAX_LOCATIONS) return reject('LOCATION_CAPACITY_EXCEEDED');
          next = [...current, { ...parsed.location, id: nextId++ }];
        }
        acceptedCount = 1;
        break;
      }
      case 'REMOVE': {
        // 이미 지워진 줄을 다시 지워도 성공(바뀐 것 없음)
        next = current.filter((location) => location.id !== parsed.targetLocationId);
        acceptedCount = next.length === current.length ? 0 : 1;
        break;
      }
      case 'MOVE': {
        const target = current.find((location) => location.id === parsed.targetLocationId);
        if (!target) return reject('LOCATION_REMOVED');
        const rest = current.filter((location) => location !== target);
        // 뒤 기준점이 있으면 그 앞, 없으면 앞 기준점 뒤, 둘 다 없으면 맨 끝
        const nextIndex = rest.findIndex((location) => location.id === parsed.nextLocationId);
        const previousIndex = rest.findIndex(
          (location) => location.id === parsed.previousLocationId,
        );
        const at =
          nextIndex >= 0 ? nextIndex : previousIndex >= 0 ? previousIndex + 1 : rest.length;
        next = [...rest.slice(0, at), target, ...rest.slice(at)];
        acceptedCount = 1;
        break;
      }
    }

    const changed =
      next.length !== current.length || next.some((location, index) => location !== current[index]);
    if (changed) {
      changeBundle(bundle.id, (latest) => ({
        ...latest,
        locations: next,
        locationsVersion: latest.locationsVersion + 1,
        lastLocationId: Math.max(latest.lastLocationId ?? 0, nextId - 1),
      }));
    }
    const updated = mockDb.get().bundles.find((item) => item.id === bundle.id) ?? bundle;
    return ok({
      bundleId: updated.id,
      revision: updated.revision,
      locationVersion: updated.locationsVersion,
      changed,
      acceptedCount: changed ? acceptedCount : 0,
      locations: locationsWithIds(updated).map((location, index) => ({
        ...location,
        position: index,
      })),
    });
  }),

  // PUT …/photos/{photoId}/pick: 본인 픽의 최종 상태(picked)를 저장하는 멱등 요청, photoId는 번들 사진 ID
  // 상태가 같으면 expectedVersion이 낡아도 성공하고 아무것도 바꾸지 않으며, 다르면 본인 행 버전과 비교해 어긋나면 BUNDLE_003(detail은 현재 픽)
  http.put(
    '/api/bunches/:bunchId/bundles/:id/photos/:photoId/pick',
    async ({ params, request }) => {
      const bundlePhotoId = toWireId(params.photoId);
      const body = await readJson(request);
      // 본문을 기다리는 사이 다른 요청이 번들을 바꿨을 수 있어, 읽은 뒤의 최신 상태로 확인
      const scope = findScope(params.bunchId, params.id);
      if ('error' in scope) return scope.error;
      const { bundle, isParticipant } = scope;
      if (bundlePhotoId === undefined) return fail(400, 'COMMON_001');
      if (
        typeof body?.picked !== 'boolean' ||
        typeof body.expectedVersion !== 'number' ||
        !Number.isSafeInteger(body.expectedVersion)
      ) {
        return fail(400, 'COMMON_002');
      }
      const { picked, expectedVersion } = body;
      if (expectedVersion < 0) return fail(400, 'COMMON_001');
      if (!isParticipant) return fail(403, 'AUTH_002');
      if (bundle.status !== 'DRAFT') return fail(409, 'BUNDLE_002');
      const photo = bundle.photos.find((item) => item.id === bundlePhotoId);
      if (!photo) return fail(404, 'RESOURCE_001');

      const mine = photo.picks?.find((row) => row.memberId === MOCK_MY_MEMBER_ID);
      if ((mine?.picked ?? false) === picked) return ok(photoPicks(bundle, bundlePhotoId));
      if (expectedVersion !== (mine?.version ?? 0)) {
        return fail(409, 'BUNDLE_003', photoPicks(bundle, bundlePhotoId));
      }
      changeBundle(bundle.id, (current) => ({
        ...current,
        photos: current.photos.map((item) =>
          item.id === bundlePhotoId
            ? {
                ...item,
                // 실변경은 번들 revision을 한 번 올리고 본인 행 버전을 그 revision으로 저장(picked=false 행도 남김)
                picks: [
                  ...(item.picks ?? []).filter((row) => row.memberId !== MOCK_MY_MEMBER_ID),
                  { memberId: MOCK_MY_MEMBER_ID, picked, version: current.revision + 1 },
                ],
              }
            : item,
        ),
      }));
      const updated = mockDb.get().bundles.find((item) => item.id === bundle.id);
      return ok(photoPicks(updated ?? bundle, bundlePhotoId));
    },
  ),

  // GET …/presence: 현재 members·editing·typing 복구용. 가짜 서버에는 실시간 연결이 없어 항상 비어 있음
  http.get('/api/bunches/:bunchId/bundles/:id/presence', ({ params }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    return ok({ members: [], typing: [], editing: [] });
  }),

  // PATCH …/title/crdt: 서버 문서에서 파생한 Automerge 전체 저장 문서를 서버 최신 문서와 병합(응답은 BundleSnapshot이 아니라 제목 상태)
  // 40자를 넘어도 자르지 않고 titleTooLong으로 알림, 같은 문서를 다시 보내면 아무것도 바꾸지 않음
  http.patch('/api/bunches/:bunchId/bundles/:id/title/crdt', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    if (!scope.isParticipant) return fail(403, 'AUTH_002');
    if (scope.bundle.status !== 'DRAFT') return fail(409, 'BUNDLE_002');
    const body = await readJson(request);
    const state = body?.state;
    if (typeof state !== 'string' || state === '' || state.length > CRDT_MAX_BASE64) {
      return fail(400, 'COMMON_001');
    }
    await ensureTitleState(scope.bundle.id);
    const current = mockDb.get().bundles.find((item) => item.id === scope.bundle.id);
    if (!current?.titleCrdtState) return fail(404, 'RESOURCE_001');
    // 요청 본문을 읽고 문서를 준비하는 동안 다른 요청이 발행했을 수 있어 최신 상태를 다시 확인
    if (current.status !== 'DRAFT') return fail(409, 'BUNDLE_002');
    let merged;
    try {
      merged = mergeTitleDocs(loadTitleDoc(current.titleCrdtState), loadTitleDoc(state));
    } catch {
      return fail(400, 'COMMON_001');
    }
    // 서버 문서의 title은 런타임 타입이 보장되지 않으므로 문자열인지 먼저 확인
    const raw: unknown = titleText(merged);
    if (typeof raw !== 'string' || hasInvalidTitleChar(raw)) return fail(400, 'COMMON_001');
    const next = saveTitleDoc(merged);
    if (next !== current.titleCrdtState) {
      changeBundle(current.id, (bundle) => ({
        ...bundle,
        title: displayTitle(raw),
        titleVersion: bundle.titleVersion + 1,
        titleCrdtState: next,
      }));
    }
    const saved = mockDb.get().bundles.find((item) => item.id === current.id);
    if (!saved) return fail(404, 'RESOURCE_001');
    return ok({
      title: saved.title,
      titleCrdtState: saved.titleCrdtState ?? next,
      titleVersion: saved.titleVersion,
      titleTooLong: countTitleGraphemes(saved.title) > TITLE_MAX,
    });
  }),

  // PUT …/title · visibility · date · comments/me
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
      // 제외되는 멤버의 코멘트와 픽을 함께 지움
      comments: current.comments.filter((comment) => comment.memberId !== memberId),
      photos: current.photos.map((photo) =>
        photo.picks
          ? { ...photo, picks: photo.picks.filter((row) => row.memberId !== memberId) }
          : photo,
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
    const body = await readJson(request);
    // expectedRevision은 호환 필드(생략·낡은 값이어도 최초 발행을 거절하지 않음), visibility는 최종 선택 범위(생략하면 초안 범위)
    const expectedRevision = body?.expectedRevision ?? null;
    const requestedVisibility = body?.visibility ?? null;
    if (
      !key ||
      !UUID.test(key) ||
      (expectedRevision !== null && !isVersion(expectedRevision)) ||
      (requestedVisibility !== null &&
        requestedVisibility !== 'PUBLIC' &&
        requestedVisibility !== 'PRIVATE')
    ) {
      return fail(400, 'COMMON_001');
    }

    const outcome = runIdempotent(
      `${MOCK_MY_MEMBER_ID}:${bunchId}:publish:${bundle.id}`,
      key,
      JSON.stringify({ visibility: requestedVisibility, expectedRevision }),
      () => {
        const current = mockDb.get().bundles.find((item) => item.id === bundle.id);
        if (!current) return { status: 404, body: { code: 'RESOURCE_001' } };
        // 생성자 또는 관리자만, 초안에서는 호출자도 참여자여야 함
        if (!(isCreator || isAdmin) || !isParticipant) {
          return { status: 403, body: { code: 'AUTH_002' } };
        }
        if (current.status === 'PUBLISHED') return { status: 409, body: { code: 'BUNDLE_002' } };
        const finalVisibility = requestedVisibility ?? current.visibility;
        const reasons = publishBlockers(current, finalVisibility);
        if (reasons.length > 0) {
          return { status: 409, body: { code: 'BUNDLE_005', detail: { reasons } } };
        }
        changeBundle(bundle.id, (latest) => ({
          ...latest,
          status: 'PUBLISHED',
          visibility: finalVisibility,
          visibilityVersion:
            finalVisibility === latest.visibility
              ? latest.visibilityVersion
              : latest.visibilityVersion + 1,
          publishedAt: nowIso(),
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
