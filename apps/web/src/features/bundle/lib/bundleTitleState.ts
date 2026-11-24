import type { z } from 'zod';
import {
  type BundleDetail,
  type BundleTitleState,
  type bundleProfanitySchema,
  toBundleProfanity,
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
export const commentProfanityChanges = (
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
