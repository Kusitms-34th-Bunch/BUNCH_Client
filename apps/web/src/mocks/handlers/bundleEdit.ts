import { http } from 'msw';
import { countTitleGraphemes } from '@/features/bundle/lib/title';
import type { MockBundle, MockBundlePhoto, MockLocation } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail } from '../lib/envelope';
import { failIfProhibited } from '../lib/prohibitedWord';
import { changeBundle, findScope, myRoleIn, nowIso, readJson, snapshotOf } from './bundles';

// 발행 번들 수정(`PUT …/bundles/{id}/published`, 서버 PR #134 기준): 메인 관리자가 최종 제목·날짜·사진 순서·위치를 한 번에 저장
const TITLE_MAX = 40;
const MAX_PHOTOS = 20;
const MAX_LOCATIONS = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PhotoInput = { bundlePhotoId?: unknown; photoId?: unknown };
type EditBody = {
  expectedRevision: number;
  title: string;
  date: string | null;
  photos: PhotoInput[];
  locations: (MockLocation & { position: number })[];
};

const isPositiveId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 서울 기준 오늘(미래 날짜는 거부)
const todayInSeoul = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

const parseLocation = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const { provider, externalId, name, address, position } = value;
  if (
    typeof provider !== 'string' ||
    !/^[a-z0-9_-]{1,32}$/.test(provider) ||
    typeof externalId !== 'string' ||
    externalId.trim() === '' ||
    typeof name !== 'string' ||
    name.trim() === '' ||
    // 주소는 필수 키이고 null 또는 빈 값이 아닌 문자열
    !('address' in value) ||
    !(address === null || (typeof address === 'string' && address.trim() !== '')) ||
    typeof position !== 'number' ||
    !Number.isInteger(position)
  ) {
    return undefined;
  }
  return { provider, externalId, name: name.trim(), address, position };
};

// 본문 형식(제목·날짜·사진 수와 XOR·위치 수와 연속 position)을 검사, 어긋나면 undefined
const parseBody = (body: Record<string, unknown> | null): EditBody | undefined => {
  if (!body) return undefined;
  const { expectedRevision, title, date, photos, locations } = body;
  if (typeof expectedRevision !== 'number' || !Number.isSafeInteger(expectedRevision)) {
    return undefined;
  }
  const trimmed = typeof title === 'string' ? title.normalize('NFC').trim() : '';
  if (trimmed === '' || /[\r\n]/.test(trimmed) || countTitleGraphemes(trimmed) > TITLE_MAX) {
    return undefined;
  }
  if (
    date !== undefined &&
    date !== null &&
    !(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayInSeoul())
  ) {
    return undefined;
  }
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > MAX_PHOTOS) return undefined;
  // 항목이 객체가 아니면(null 등) 식별자를 읽기 전에 거절
  if (!photos.every(isRecord)) return undefined;
  if (!Array.isArray(locations) || locations.length > MAX_LOCATIONS) return undefined;
  const parsedLocations = locations.map(parseLocation);
  if (parsedLocations.some((location) => location === undefined)) return undefined;
  const places = parsedLocations.filter((location) => location !== undefined);
  // position은 0부터 연속 정수, 같은 장소(provider+externalId)는 한 번만
  const ordered = [...places].sort((a, b) => a.position - b.position);
  if (!ordered.every((place, index) => place.position === index)) return undefined;
  const keys = new Set(places.map((place) => `${place.provider}:${place.externalId}`));
  if (keys.size !== places.length) return undefined;
  return {
    expectedRevision,
    title: trimmed,
    date: typeof date === 'string' ? date : null,
    photos,
    locations: ordered,
  };
};

export const bundleEditHandlers = [
  // PUT /api/v1/bunches/{bunchId}/bundles/{id}/published
  http.put('/api/bunches/:bunchId/bundles/:id/published', async ({ params, request }) => {
    const scope = findScope(params.bunchId, params.id);
    if ('error' in scope) return scope.error;
    const { bunchId } = scope;
    const requestId = request.headers.get('X-Request-Id');
    if (requestId !== null && !UUID.test(requestId)) return fail(400, 'COMMON_001');
    // 수정은 현재 번치의 메인 관리자(OWNER)만, 공동 관리자·멤버는 본문 검증보다 먼저 거부
    if (myRoleIn(mockDb.get(), bunchId) !== 'OWNER') return fail(403, 'AUTH_002');
    const body = parseBody(await readJson(request));
    if (!body) return fail(400, 'COMMON_001');
    // 제출한 제목의 금칙어 검사(기능명세 6.2.12, 코멘트는 이 경로의 입력이 아님)
    const prohibited = failIfProhibited({ title: body.title });
    if (prohibited) return prohibited;
    const current = mockDb.get().bundles.find((item) => item.id === scope.bundle.id);
    if (!current) return fail(404, 'RESOURCE_001');
    // 발행 전 초안은 이 경로로 고치지 않음
    if (current.status !== 'PUBLISHED') return fail(409, 'BUNDLE_002');
    // 낡은 revision은 같은 내용이어도 거부(detail에 현재 revision)
    if (body.expectedRevision !== current.revision) {
      return fail(409, 'BUNDLE_003', { revision: current.revision, version: current.revision });
    }

    // 사진: 각 항목은 bundlePhotoId와 photoId 중 정확히 하나, 중복 없음
    const state = mockDb.get();
    const keptIds = new Set<number>();
    const newSourceIds = new Set<number>();
    const photoInputs: ({ kind: 'keep'; id: number } | { kind: 'add'; photoId: number })[] = [];
    for (const input of body.photos) {
      const hasBundle = input.bundlePhotoId !== undefined && input.bundlePhotoId !== null;
      const hasSource = input.photoId !== undefined && input.photoId !== null;
      if (hasBundle === hasSource) return fail(400, 'COMMON_001');
      if (hasBundle) {
        const id = input.bundlePhotoId;
        if (
          !isPositiveId(id) ||
          keptIds.has(id) ||
          !current.photos.some((photo) => photo.id === id)
        ) {
          return fail(400, 'COMMON_001');
        }
        keptIds.add(id);
        photoInputs.push({ kind: 'keep', id });
      } else {
        const id = input.photoId;
        // 같은 번치 사진함의 원본만, 이미 번들에 연결된 원본을 새 사진으로 다시 넣는 것은 거부
        const source = isPositiveId(id)
          ? state.photos.find((photo) => photo.photoId === id && photo.bunchId === bunchId)
          : undefined;
        if (
          !source ||
          newSourceIds.has(source.photoId) ||
          current.photos.some((photo) => photo.photoId === source.photoId)
        ) {
          return fail(400, 'COMMON_001');
        }
        newSourceIds.add(source.photoId);
        photoInputs.push({ kind: 'add', photoId: source.photoId });
      }
    }

    changeBundle(current.id, (latest) => {
      const at = nowIso();
      let nextPhotoId = Math.max(
        0,
        ...state.bundles.flatMap((bundle) => bundle.photos.map((p) => p.id)),
      );
      const photos: MockBundlePhoto[] = photoInputs.map((input, position) => {
        if (input.kind === 'keep') {
          const existing = latest.photos.find((photo) => photo.id === input.id);
          return { ...(existing as MockBundlePhoto), position };
        }
        const source = state.photos.find((photo) => photo.photoId === input.photoId);
        nextPhotoId += 1;
        return {
          id: nextPhotoId,
          photoId: input.photoId,
          imageAssetId: input.photoId + 7000,
          imageUrl: source?.imageUrl ?? '',
          position,
          addedBy: MOCK_MY_MEMBER_ID,
          addedAt: at,
        };
      });
      // 같은 장소는 줄 id를 유지하고 새 장소만 새 id를 받음
      let nextLocationId =
        Math.max(
          latest.lastLocationId ?? 0,
          ...latest.locations.map((location) => location.id ?? 0),
        ) + 1;
      const locations: MockLocation[] = body.locations.map(
        ({ provider, externalId, name, address }) => {
          const existing = latest.locations.find(
            (location) => location.provider === provider && location.externalId === externalId,
          );
          return { provider, externalId, name, address, id: existing?.id ?? nextLocationId++ };
        },
      );
      const sameLocations =
        locations.length === latest.locations.length &&
        locations.every((location, index) => {
          const before = latest.locations[index];
          return (
            before?.provider === location.provider &&
            before.externalId === location.externalId &&
            before.name === location.name &&
            before.address === location.address
          );
        });
      const next: MockBundle = {
        ...latest,
        title: body.title,
        titleVersion: body.title === latest.title ? latest.titleVersion : latest.titleVersion + 1,
        date: body.date,
        dateVersion: body.date === latest.date ? latest.dateVersion : latest.dateVersion + 1,
        photos,
        locations,
        locationsVersion: sameLocations ? latest.locationsVersion : latest.locationsVersion + 1,
        lastLocationId: Math.max(latest.lastLocationId ?? 0, nextLocationId - 1),
      };
      // 제목이 바뀌면 이전 CRDT 문서는 새 제목과 맞지 않아 버림(발행본 snapshot은 문서를 싣지 않음)
      delete next.titleCrdtState;
      return next;
    });
    // 번들에서 콕한 장소가 새 위치 목록에 없으면 알림 없이 「콕한 장소」에서도 지움(광고에서 콕한 장소와 다른 번들의 콕은 그대로)
    const keptKeys = new Set(
      body.locations.map(({ provider, externalId }) => `${provider}:${externalId}`),
    );
    mockDb.update((latest) => ({
      ...latest,
      koks: latest.koks.filter(
        (kok) =>
          kok.sourceBundleId !== current.id || keptKeys.has(`${kok.provider}:${kok.externalId}`),
      ),
    }));
    return snapshotOf(current.id);
  }),
];
