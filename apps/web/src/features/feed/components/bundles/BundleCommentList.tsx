'use client';

import type { RefObject } from 'react';
import { Button } from '@app/design-system';
import { CommentItem } from '@app/design-system/web';
import Image, { type StaticImageData } from 'next/image';
import commentEmpty from '@/shared/assets/images/empty/comment-empty.svg';
import { LoadingRipple } from '@/shared/components/loading/LoadingRipple';
import type { useBundleComments } from '../../hooks/useBundleComments';
import type { FeedComment } from '../../lib/types';
import { FEED_MESSAGES as text } from '../../constants/messages';
import { DELETED_USER_IMAGE } from '../../lib/deletedUserImage';

// 버튼 이름에 붙일 댓글 앞부분: 줄바꿈을 공백으로, 이모지가 반으로 잘리지 않게 글자 단위로 20자
const previewOf = (content = '') =>
  Array.from(content.replace(/\s+/g, ' ').trim()).slice(0, 20).join('');

/** 목록이 그리는 데 쓰는 댓글 상태(등록·삭제 같은 변경 동작은 container에 둠) */
export type BundleCommentThread = Pick<
  ReturnType<typeof useBundleComments>,
  | 'comments'
  | 'moreRef'
  | 'loading'
  | 'failed'
  | 'retry'
  | 'fetchingMore'
  | 'moreFailed'
  | 'moreFailures'
  | 'loadMore'
  | 'canLoadMore'
>;

type BundleCommentListProps = {
  thread: BundleCommentThread;
  /** 댓글 영역(스크롤·초점 대상). 화면이 위치를 계산하고 결과 초점을 옮김 */
  sectionRef: RefObject<HTMLElement | null>;
  /** 상태 영역에 읽어 줄 등록 결과(받는 중 안내가 우선) */
  announcement: string;
  /** 소속 번치가 없음: 답글·신고를 눌렀을 때 안내하도록 버튼을 둠 */
  noBunch: boolean;
  onReply: (_comment: FeedComment) => void;
  onMyCommentMore: (_comment: FeedComment) => void;
  onReportMore: (_comment: FeedComment) => void;
  onOpenProfile: (_memberId: string) => void;
};

/** 번들 상세 댓글 목록(명세 014~017): 받는 중·실패·빈 목록, 다음 쪽 받기와 다시 시도 */
export function BundleCommentList({
  thread,
  sectionRef,
  announcement,
  noBunch,
  onReply,
  onMyCommentMore,
  onReportMore,
  onOpenProfile,
}: BundleCommentListProps) {
  const { comments, moreRef } = thread;
  return (
    <>
      {/* 늘 있는 상태 영역에서 글자만 바꿔 읽어 줌(등록 결과, 댓글을 받는 중) */}
      <p role="status" className="sr-only">
        {thread.loading
          ? text.commentsLoading
          : thread.fetchingMore
            ? text.moreCommentsLoading
            : announcement}
      </p>
      <section
        ref={sectionRef}
        aria-label={text.commentsTitle}
        tabIndex={-1}
        className="relative focus:outline-none"
      >
        {comments.length > 0 ? (
          <ul className="px-padding-p8 pt-padding-p8">
            {comments.map((comment) => (
              <li
                key={comment.id}
                id={`comment-${comment.id}`}
                tabIndex={-1}
                // 초점을 받으면(알림 진입·등록) 작성자 이름 다음에 본문도 읽힘. 삭제된 댓글은 이름에 담겨 제외
                aria-describedby={
                  !comment.deleted && comment.content ? `comment-body-${comment.id}` : undefined
                }
                // 등록·삭제 뒤 초점이 오면 어떤 댓글인지 읽히게 이름을 붙임
                aria-label={
                  comment.deleted
                    ? text.deletedCommentLabel
                    : comment.reply
                      ? text.replyLabel(comment.author)
                      : text.commentLabel(comment.author)
                }
                className="focus-visible:outline-border-brand rounded-r4 focus-visible:outline-2 data-quiet-focus:focus-visible:outline-none"
              >
                <CommentItem
                  contentId={`comment-body-${comment.id}`}
                  author={comment.author}
                  onProfile={
                    comment.memberId ? onOpenProfile.bind(null, comment.memberId) : undefined
                  }
                  avatarSrc={comment.deleted ? DELETED_USER_IMAGE : comment.avatarSrc}
                  bunchName={comment.bunchName}
                  bunchColor={comment.bunchColor}
                  date={comment.date}
                  content={comment.content}
                  reply={comment.reply}
                  deleted={comment.deleted}
                  replyCount={comment.replyCount}
                  // 답글은 서버 권한(삭제되지 않은 원댓글). 소속 번치가 없으면 눌렀을 때 안내
                  onReply={
                    comment.pending || comment.deleted || !(comment.canReply || noBunch)
                      ? undefined
                      : () => onReply(comment)
                  }
                  moreLabel={
                    comment.canDelete
                      ? text.myCommentMore(previewOf(comment.content))
                      : text.commentMore(comment.author, previewOf(comment.content))
                  }
                  // 서버 권한대로 내 댓글은 삭제, 남의 댓글은 신고. 소속 번치가 없으면 신고를 눌렀을 때 안내
                  onMore={
                    comment.deleted || comment.pending
                      ? undefined
                      : comment.canDelete
                        ? () => onMyCommentMore(comment)
                        : comment.canReport || noBunch
                          ? () => onReportMore(comment)
                          : undefined
                  }
                />
              </li>
            ))}
          </ul>
        ) : thread.loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingRipple />
          </div>
        ) : thread.failed ? (
          // 기능명세서는 토스트지만 다시 받을 길이 없어 그 자리에 안내와 다시 시도를 둠
          <div className="gap-s8 flex h-64 flex-col items-center justify-center">
            <p role="alert" className="typography-body-4-regular text-text-quinary">
              {text.actionFailed}
            </p>
            <Button
              variant="tertiary"
              size="md"
              // 누르면 받는 중으로 바뀌어 버튼이 사라지므로 초점을 댓글 영역에 둠
              onClick={() => {
                sectionRef.current?.focus({ preventScroll: true });
                thread.retry();
              }}
            >
              {text.retry}
            </Button>
          </div>
        ) : (
          // Figma 5367:103541: 일러스트 72×72와 문구(13/18) 사이 12, 영역 256 안에서 가운데
          <div className="gap-s6 flex h-64 flex-col items-center justify-center">
            {/* SVG import 타입이 any라 정적 이미지로 명시, 테스트(vitest)에선 문자열이라 크기는 직접 넘김 */}
            <Image src={commentEmpty as StaticImageData} alt="" width={72} height={72} />
            <p className="typography-body-4-regular text-text-quinary">{text.noComments}</p>
          </div>
        )}
        {/* 보이면 다음 쪽(실패하면 다시 내려올 때 다시 시도). 받을 수 있을 때만 그려 새로 붙는 순간 확인 */}
        {thread.canLoadMore ? (
          <div ref={moreRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" />
        ) : null}
        {thread.fetchingMore && !thread.moreFailed ? (
          <div className="flex justify-center pb-6">
            <LoadingRipple />
          </div>
        ) : null}
        {thread.moreFailed ? (
          // 목록 끝이 다시 보일 때도 다시 받지만, 스크롤 없이 다시 받을 수 있게 버튼을 둠
          <div className="gap-s4 flex flex-col items-center pb-6">
            <p
              // 다시 실패하면 새로 그려 같은 안내도 다시 읽힘
              key={thread.moreFailures}
              role="alert"
              className="typography-body-4-regular text-text-quinary"
            >
              {text.moreCommentsFailed}
            </p>
            {/* 받고 나면 버튼이 사라지므로 누를 때 초점을 댓글 영역에 둠. 받는 동안은 버튼을 남기고 막음 */}
            <Button
              variant="tertiary"
              size="md"
              aria-disabled={thread.fetchingMore}
              onClick={() => {
                if (thread.fetchingMore) return;
                sectionRef.current?.focus({ preventScroll: true });
                thread.loadMore();
              }}
            >
              {text.retry}
            </Button>
          </div>
        ) : null}
      </section>
    </>
  );
}
