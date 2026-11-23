import type { z } from 'zod';
import { replaceEqualDeep } from '@tanstack/react-query';
import { toDomainId } from '@/shared/api/ids';
import {
  type BundleDetail,
  type BundleTitleState,
  bundleEventDataSchemas,
  type bundleProfanitySchema,
  toBundleProfanity,
  toDetailComment,
  toDetailLocations,
  toDetailPhotos,
  toParticipantIds,
} from '../model/bundle';

/**
 * 제목 상태(병합 응답·TITLE 이벤트). 제목 금칙어 여부·발행 차단 사유는 없을 수 있음(없으면 기존 값을 둠)
 * 제목 상태로는 제목에 관한 값만 바꿈: 병합 응답은 revision이 없어, 그사이 받은 코멘트 금칙어·다른 차단 사유를 낡은 값으로 덮지 않게 함
 */
type TitleStateInput = Omit<BundleTitleState, 'profanity' | 'publishBlockers'> & {
  titleProhibited?: boolean | undefined;
  publishBlockers?: readonly string[] | null | undefined;
};

/** 제목에서 생기는 발행 차단 사유 */
const TITLE_BLOCKERS: readonly string[] = [
  'TITLE_REQUIRED',
  'TITLE_TOO_LONG',
  'TITLE_PROHIBITED_WORD',
];
const isTitleBlocker = (reason: string) => TITLE_BLOCKERS.includes(reason);

/** 금칙어 상태(병합 응답·TITLE 이벤트의 원본)에서 제목 금칙어 여부만 꺼냄 */
export const titleProhibitedOf = (
  profanity: z.infer<typeof bundleProfanitySchema> | null | undefined,
): boolean | undefined => profanity?.titleHasProhibitedWord;

type ProfanityChange = {
  profanity?: z.infer<typeof bundleProfanitySchema> | null | undefined;
  publishBlockers?: readonly string[] | null | undefined;
};

/**
 * 코멘트 쪽 이벤트(COMMENT·PARTICIPANTS)의 금칙어 상태로는 코멘트에 관한 값만 바꿈
 * 제목 병합 응답은 revision을 올리지 않아, 병합보다 먼저 처리된 코멘트 이벤트가 늦게 와도 제목 금칙어·제목 계열 사유를 낡은 값으로 덮지 않게 함
 * 제목 쪽은 TITLE 이벤트·병합 응답(`withTitleState`)만 바꿈. 아직 금칙어 상태를 모르면 이벤트의 제목 값을 씀
 */
const commentProfanityChanges = (
  detail: BundleDetail,
  { profanity, publishBlockers }: ProfanityChange,
): Partial<BundleDetail> => {
  const incoming = toBundleProfanity(profanity);
  return {
    ...(incoming
      ? {
          profanity: {
            titleProhibited: detail.profanity?.titleProhibited ?? incoming.titleProhibited,
            prohibitedCommentMemberIds: incoming.prohibitedCommentMemberIds,
          },
        }
      : {}),
    ...(publishBlockers
      ? {
          publishBlockers: [
            ...publishBlockers.filter((reason) => !isTitleBlocker(reason)),
            ...detail.publishBlockers.filter(isTitleBlocker),
          ],
        }
      : {}),
  };
};

/** 병합된 제목 상태(응답·이벤트)를 상세에 반영: 더 낡은 제목 버전으로 덮지 않고, 길이 초과 발행 사유와 금칙어 상태도 맞춤 */
export const withTitleState = (
  detail: BundleDetail,
  state: TitleStateInput,
  revision?: number,
): BundleDetail => {
  // 더 낡은 제목은 반영하지 않지만, 이벤트로 알게 된 revision은 맞춤(이후 이벤트가 건너뛴 것으로 보이지 않게)
  if (state.titleVersion < detail.titleVersion) {
    return revision === undefined
      ? detail
      : { ...detail, revision: Math.max(detail.revision, revision) };
  }
  // 제목 계열 사유만 이 제목 상태 기준으로 바꾸고 나머지(사진·코멘트 등)는 그대로 둠
  const otherBlockers = detail.publishBlockers.filter((reason) => !isTitleBlocker(reason));
  const titleBlockers = state.publishBlockers
    ? state.publishBlockers.filter(isTitleBlocker)
    : [
        ...detail.publishBlockers.filter(
          (reason) => isTitleBlocker(reason) && reason !== 'TITLE_TOO_LONG',
        ),
        ...(state.titleTooLong ? ['TITLE_TOO_LONG'] : []),
      ];
  return {
    ...detail,
    title: state.title,
    titleVersion: state.titleVersion,
    titleCrdtState: state.titleCrdtState,
    titleTooLong: state.titleTooLong,
    publishBlockers: [...otherBlockers, ...titleBlockers],
    ...(state.titleProhibited === undefined
      ? {}
      : {
          profanity: {
            prohibitedCommentMemberIds: detail.profanity?.prohibitedCommentMemberIds ?? [],
            titleProhibited: state.titleProhibited,
          },
        }),
    revision: revision === undefined ? detail.revision : Math.max(detail.revision, revision),
  };
};

/**
 * 내 픽 버전이 뒤로 가는 상세로는 그 사진의 픽을 되돌리지 않음
 * 픽 저장 응답은 번들 revision을 알려 주지 않아 캐시 revision이 그대로라, 저장보다 먼저 시작한 재조회가 나중에 도착하면
 * 같은 revision으로 보여 방금 저장한 픽을 덮을 수 있음. 내 픽 버전(`picks.version`)은 사진마다 오르기만 하므로 그 값으로 낡은 응답을 거름
 * 같은 버전이면 다른 멤버의 픽이 더 새로울 수 있어 들어온 값을 씀
 */
export const keepNewerPicks = (previous: BundleDetail, incoming: BundleDetail): BundleDetail => {
  let changed = false;
  const photos = incoming.photos.map((photo) => {
    const before = previous.photos.find((old) => old.id === photo.id)?.picks;
    if (before && before.version > (photo.picks?.version ?? 0)) {
      changed = true;
      return { ...photo, picks: before };
    }
    return photo;
  });
  return changed ? { ...incoming, photos } : incoming;
};

/**
 * 장소 목록 버전이 뒤로 가는 상세로는 장소 목록을 되돌리지 않음
 * 장소 작업 응답도 번들 revision을 캐시에 올리지 않아, 응답을 쓴 뒤에 먼저 시작한 재조회가 같은 revision으로 도착하면
 * 낡은 목록이 방금 쓴 목록을 덮을 수 있음. `locationVersion`은 저장마다 오르므로 그 값으로 낡은 응답을 거름
 */
export const keepNewerLocations = (previous: BundleDetail, incoming: BundleDetail): BundleDetail =>
  previous.locationVersion > incoming.locationVersion
    ? {
        ...incoming,
        locations: previous.locations,
        locationVersion: previous.locationVersion,
      }
    : incoming;

/** 이벤트 처리 결과: 상세에 반영한 값, 서버 최신 상세로 맞춤, 아무것도 하지 않음 */
export type BundleEventOutcome =
  | { kind: 'apply'; detail: BundleDetail }
  | { kind: 'refetch' }
  | { kind: 'ignore' };

const REFETCH: BundleEventOutcome = { kind: 'refetch' };
const apply = (detail: BundleDetail): BundleEventOutcome => ({ kind: 'apply', detail });

/**
 * 바로 다음 revision인 내용 이벤트를 상세에 적용(v5: 정확히 다음 revision은 type에 맞는 data를 적용)
 * data 모양이 다르면 추측하지 않고 최신 상세를 다시 받음
 * 본인 권한은 요청자마다 달라 방송 data에 기대지 않으므로 CREATED·PUBLISHED·EDITED·PERMISSIONS는 항상 다시 받음
 * 저장 버전이 이미 더 높은 필드는 낡은 이벤트로 덮지 않고 revision만 맞춤
 */
export const applyContentEvent = (
  detail: BundleDetail,
  type: string,
  data: unknown,
  revision: number,
): BundleEventOutcome => {
  const next = (changes: Partial<BundleDetail>) => apply({ ...detail, ...changes, revision });
  const schemas = bundleEventDataSchemas;

  switch (type) {
    case 'TITLE': {
      const parsed = schemas.TITLE.safeParse(data);
      if (!parsed.success) return REFETCH;
      const { profanity, ...state } = parsed.data;
      return apply(
        withTitleState(
          detail,
          { ...state, titleProhibited: titleProhibitedOf(profanity) },
          revision,
        ),
      );
    }
    case 'DATE': {
      const parsed = schemas.DATE.safeParse(data);
      if (!parsed.success) return REFETCH;
      if (parsed.data.version < detail.dateVersion) return next({});
      return next({
        date: parsed.data.value,
        dateVersion: parsed.data.version,
        dateChips: parsed.data.dateChips,
      });
    }
    case 'VISIBILITY': {
      const parsed = schemas.VISIBILITY.safeParse(data);
      if (!parsed.success) return REFETCH;
      if (parsed.data.version < detail.visibilityVersion) return next({});
      return next({ visibility: parsed.data.value, visibilityVersion: parsed.data.version });
    }
    case 'LOCATION': {
      const parsed = schemas.LOCATION.safeParse(data);
      if (!parsed.success) return REFETCH;
      // 낡은 목록으로 더 새로운 장소 목록을 덮지 않고 revision만 맞춤
      if (parsed.data.version < detail.locationVersion) return next({});
      return next({
        locations: toDetailLocations(parsed.data.locations),
        locationVersion: parsed.data.version,
      });
    }
    case 'PHOTOS': {
      const parsed = schemas.PHOTOS.safeParse(data);
      // 픽은 전용 이벤트가 없고, 방송 이벤트의 픽은 요청자 기준 값(pickedByMe·version)이 아니라 쓰지 않고 기존 픽을 이어 붙임
      return parsed.success
        ? next({
            photos: toDetailPhotos(parsed.data.photos).map((photo) => ({
              ...photo,
              picks: detail.photos.find((old) => old.id === photo.id)?.picks,
            })),
            dateChips: parsed.data.dateChips,
          })
        : REFETCH;
    }
    case 'COMMENT': {
      const parsed = schemas.COMMENT.safeParse(data);
      if (!parsed.success) return REFETCH;
      const incoming = toDetailComment(parsed.data);
      const existing = detail.comments.find((comment) => comment.memberId === incoming.memberId);
      if (existing && existing.version > incoming.version) return next({});
      return next({
        comments: existing
          ? detail.comments.map((comment) => (comment === existing ? incoming : comment))
          : [...detail.comments, incoming],
        ...commentProfanityChanges(detail, parsed.data),
      });
    }
    case 'PARTICIPANTS': {
      const parsed = schemas.PARTICIPANTS.safeParse(data);
      if (!parsed.success) return REFETCH;
      const removed = new Set((parsed.data.removedCommentMemberIds ?? []).map(toDomainId));
      return next({
        participantIds: toParticipantIds(parsed.data.participants),
        comments: parsed.data.comments
          .map(toDetailComment)
          .filter((comment) => !removed.has(comment.memberId)),
        ...commentProfanityChanges(detail, parsed.data),
      });
    }
    default:
      return REFETCH;
  }
};

/** 내용 revision을 올리지 않는 날짜 추천 갱신(DATE_CHIPS) */
export const applyDateChips = (detail: BundleDetail, data: unknown): BundleEventOutcome => {
  const parsed = bundleEventDataSchemas.DATE_CHIPS.safeParse(data);
  return parsed.success ? apply({ ...detail, dateChips: parsed.data }) : REFETCH;
};

/**
 * 다시 받은 상세를 캐시 값과 합침(상세 query의 구조 공유)
 * 낡은 revision 응답은 버리고, 같거나 더 새 revision이면 쓰되 바뀌지 않은 부분은 참조를 유지
 */
export const mergeFetchedDetail = (
  previous: BundleDetail | undefined,
  incoming: BundleDetail,
): BundleDetail => {
  if (!previous) return incoming;
  if (previous.revision > incoming.revision) return previous;
  // 픽 저장 응답도 revision을 바꾸지 않아, 같은 revision의 낡은 상세가 방금 저장한 픽을 되돌리지 않게 함
  const current = keepNewerLocations(previous, keepNewerPicks(previous, incoming));
  // 제목 병합 응답은 revision을 바꾸지 않아, 같은 revision의 낡은 상세가 더 높은 제목 버전을 되돌리지 않게 함
  if (previous.titleCrdtState !== undefined && previous.titleVersion > current.titleVersion) {
    const kept = withTitleState(current, {
      title: previous.title,
      titleCrdtState: previous.titleCrdtState,
      titleVersion: previous.titleVersion,
      titleTooLong: previous.titleTooLong,
      // 제목 금칙어 여부와 제목 계열 발행 차단 사유도 지킨 제목(더 높은 버전)의 값으로 둠
      titleProhibited: previous.profanity?.titleProhibited,
      publishBlockers: previous.publishBlockers,
    });
    return replaceEqualDeep(previous, kept);
  }
  return replaceEqualDeep(previous, current);
};
