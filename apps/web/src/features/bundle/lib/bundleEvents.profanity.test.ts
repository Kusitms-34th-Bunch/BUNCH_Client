import { describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { applyContentEvent, withTitleState } from './bundleEvents';

// 이 테스트가 보는 필드(revision·제목·코멘트·금칙어·발행 차단 사유)만 채운 상세
const detail = {
  revision: 3,
  title: '제목',
  titleVersion: 2,
  titleCrdtState: 'doc',
  titleTooLong: false,
  comments: [{ memberId: '7', content: '좋아요', version: 1 }],
  participantIds: ['7'],
  publishBlockers: [],
  profanity: { titleProhibited: false, prohibitedCommentMemberIds: [] },
} as unknown as BundleDetail;

const profanity = (title: boolean, prohibitedCommentMemberIds: number[] = []) => ({
  dictionaryVersion: 'v1',
  titleHasProhibitedWord: title,
  comments: [7, 8].map((memberId) => ({
    memberId,
    hasProhibitedWord: prohibitedCommentMemberIds.includes(memberId),
  })),
});

const comment = {
  id: 1,
  memberId: 7,
  content: '나쁜 말',
  version: 2,
  createdAt: '2026-11-18T00:00:00Z',
  updatedAt: '2026-11-18T00:00:00Z',
  profileAvailable: true,
};

describe('금칙어 상태가 실린 이벤트', () => {
  it('TITLE 이벤트의 금칙어 상태와 발행 차단 사유를 반영한다', () => {
    const outcome = applyContentEvent(
      detail,
      'TITLE',
      {
        title: '나쁜 제목',
        titleVersion: 3,
        titleCrdtState: 'doc2',
        titleTooLong: false,
        profanity: profanity(true),
        publishBlockers: ['TITLE_PROHIBITED_WORD'],
      },
      4,
    );

    expect(outcome.kind).toBe('apply');
    if (outcome.kind !== 'apply') return;
    expect(outcome.detail.profanity).toEqual({
      titleProhibited: true,
      prohibitedCommentMemberIds: [],
    });
    expect(outcome.detail.publishBlockers).toEqual(['TITLE_PROHIBITED_WORD']);
  });

  it('COMMENT 이벤트의 금칙어 상태로 그 멤버의 코멘트 금칙어를 반영한다', () => {
    const outcome = applyContentEvent(
      detail,
      'COMMENT',
      {
        ...comment,
        profanity: profanity(false, [7]),
        publishBlockers: ['COMMENTS_PROHIBITED_WORD'],
      },
      4,
    );

    expect(outcome.kind).toBe('apply');
    if (outcome.kind === 'apply')
      expect(outcome.detail.profanity?.prohibitedCommentMemberIds).toEqual(['7']);
  });

  it('금칙어 상태가 없는 이벤트는 기존 상태를 그대로 둔다', () => {
    const flagged = {
      ...detail,
      profanity: { titleProhibited: true, prohibitedCommentMemberIds: ['7'] },
    } as BundleDetail;

    const outcome = applyContentEvent(flagged, 'COMMENT', comment, 4);

    expect(outcome.kind).toBe('apply');
    if (outcome.kind === 'apply') expect(outcome.detail.profanity).toEqual(flagged.profanity);
  });

  it('더 낡은 제목 버전의 응답은 금칙어 상태도 덮지 않는다', () => {
    const next = withTitleState(detail, {
      title: '옛 제목',
      titleVersion: 1,
      titleCrdtState: 'old',
      titleTooLong: false,
      titleProhibited: true,
    });

    expect(next.profanity?.titleProhibited).toBe(false);
  });

  it('제목 병합 응답은 제목 금칙어와 제목 계열 사유만 바꾸고, 그사이 받은 코멘트 금칙어는 덮지 않는다', () => {
    const withComment = {
      ...detail,
      profanity: { titleProhibited: false, prohibitedCommentMemberIds: ['7'] },
      publishBlockers: ['COMMENTS_PROHIBITED_WORD'],
    } as BundleDetail;

    // 병합 응답은 코멘트가 바뀌기 전 시점의 상태(코멘트 금칙어 없음)를 담고 있음
    const next = withTitleState(withComment, {
      title: '나쁜 제목',
      titleVersion: 3,
      titleCrdtState: 'doc2',
      titleTooLong: false,
      titleProhibited: true,
      publishBlockers: ['TITLE_PROHIBITED_WORD'],
    });

    expect(next.profanity).toEqual({ titleProhibited: true, prohibitedCommentMemberIds: ['7'] });
    expect(next.publishBlockers).toEqual(['COMMENTS_PROHIBITED_WORD', 'TITLE_PROHIBITED_WORD']);
  });
});
