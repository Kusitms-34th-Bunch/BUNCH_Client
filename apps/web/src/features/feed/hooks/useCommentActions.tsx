'use client';

import { isApiError } from '@app/api-core';
import { ConfirmDialog, LineTrashcanMediumIcon, toast } from '@app/design-system';
import { MoreMenuSheet } from '@app/design-system/web';
import { useState, type RefObject } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { isWireId } from '@/shared/api/ids';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import type { FeedComment, FeedViewer } from '../lib/types';
import type { useBundleComments } from './useBundleComments';
import type { useBundleReport } from './useBundleReport';
import { FEED_MESSAGES as text } from '../constants/messages';
import { withRo } from '../lib/josa';
import { useCommentFeedback } from './useCommentFeedback';

const codeOf = (error: unknown) => (isApiError(error) ? error.code : undefined);

type CommentActionsOptions = {
  thread: ReturnType<typeof useBundleComments>;
  viewer: FeedViewer | null | undefined;
  viewerId: string | null | undefined;
  asBunch: (_action: () => void) => void;
  report: ReturnType<typeof useBundleReport>;
  /** 댓글 등록·삭제·신고의 공통 실패 처리 */
  failAction: (_error: unknown) => void;
  focusInput: () => void;
  commentsRef: RefObject<HTMLElement | null>;
};

/**
 * 번들 상세 댓글 동작(명세 014~019): 입력 초안·답글 대상, 등록, 내 댓글 삭제, 남의 댓글 신고와 숨김
 * 결과 안내·초점은 `useCommentFeedback`
 */
export function useCommentActions({
  thread,
  viewer,
  viewerId,
  asBunch,
  report,
  failAction,
  focusInput,
  commentsRef,
}: CommentActionsOptions) {
  const { comments } = thread;
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; author: string } | null>(null);
  const openOverlay = useScreenOverlay();
  const { announcement, announce, focusAfterUpdate } = useCommentFeedback(comments, commentsRef);

  // 응답을 기다리는 사이 명의(지금 번치)가 바뀌었는지(늦게 온 결과를 새 명의의 목록에 적용하지 않게)
  const isViewer = usePreservedCallback((id: string | null | undefined) => id === viewerId);

  // 남의 댓글 신고: 접수되면 그 댓글(원댓글이면 답글까지)을 바로 숨기고 그 자리 다음 댓글로 초점
  // 시트가 닫힌 시점의 최신 목록으로 계산
  const hideReported = usePreservedCallback((comment: FeedComment) => {
    const index = comments.findIndex(({ id }) => id === comment.id);
    // 숨길 범위(원댓글이면 그 답글까지) 다음의 첫 댓글, 없으면 앞 댓글
    const gone = (item: FeedComment) => item.id === comment.id || item.parentId === comment.id;
    const nextItem = comments.slice(index).find((item) => !gone(item)) ?? comments[index - 1];
    focusAfterUpdate(nextItem?.id ?? 'none', text.reported);
    thread.hide(comment.id);
    setReplyTarget((target) => (target?.id === comment.id ? null : target));
  });

  const bunchRo = viewer ? withRo(viewer.name) : null;
  const placeholder = replyTarget
    ? bunchRo
      ? text.replyPlaceholderAs(bunchRo)
      : text.replyPlaceholder
    : bunchRo
      ? text.commentPlaceholderAs(bunchRo)
      : text.commentPlaceholder;

  const submit = (value: string) =>
    asBunch(() => {
      const content = value.trim();
      // 보내는 동안은 다시 보내지 않음(연타해도 한 번만 등록, hook이 막음)
      if (!viewer || !content) return;
      const parentId = replyTarget?.id ?? null;
      thread.create(content, parentId, {
        // 기다리는 사이 고친 입력·바꾼 답글 대상은 지우지 않음
        onSuccess: (saved) => {
          setDraft((current) => (current.trim() === content ? '' : current));
          setReplyTarget((current) => ((current?.id ?? null) === parentId ? null : current));
          announce(parentId ? text.replyAdded : text.commentAdded);
          focusAfterUpdate(String(saved.id));
        },
        // 실패하면 쓴 내용은 그대로 둠
        onError: (error) => {
          // 답글 대상이 그사이 지워졌거나 숨겨짐: 답글 상태를 풀고 목록을 맞춤(번들이 사라졌으면 다시 받은 목록이 알려 떠남)
          if (codeOf(error) === 'BUNDLE_002' || (parentId && codeOf(error) === 'RESOURCE_001')) {
            setReplyTarget(null);
            thread.restart();
            toast(text.replyTargetDeleted);
            return;
          }
          failAction(error);
        },
      });
    });

  const openDeleteConfirm = (comment: FeedComment) => {
    let confirmed = false;
    openOverlay(
      (rootProps, close) => (
        <ConfirmDialog
          {...rootProps}
          title={text.deleteCommentTitle}
          description={text.deleteCommentDescription}
          cancelLabel={text.cancel}
          confirmLabel={text.deleteComment}
          onConfirm={() => {
            confirmed = true;
            close();
          }}
        />
      ),
      // 창이 다 닫힌 뒤 지우고 알려 토스트가 창 뒤에 묻히지 않게 함. 더보기가 사라지므로 그 댓글로 초점
      () => {
        if (!confirmed) return;
        thread.remove(comment, {
          onSuccess: () => {
            // 삭제된 댓글에는 답글을 달 수 없으므로 그 댓글에 쓰던 답글 상태를 풂
            setReplyTarget((target) => (target?.id === comment.id ? null : target));
            focusAfterUpdate(comment.id, text.commentDeleted);
          },
          onError: (error) => {
            // 이미 지워졌거나 없는 댓글이면 바뀐 상태로 맞추고 따로 알리지 않음(번들이 사라졌으면 다시 받은 목록이 알려 떠남)
            if (codeOf(error) === 'RESOURCE_001') {
              thread.restart();
              return;
            }
            failAction(error);
          },
        });
      },
    );
  };

  const reportComment = (comment: FeedComment) => {
    if (!isWireId(comment.id)) return;
    const reportedAs = viewerId;
    report.openReport(
      text.reportCommentTitle,
      { commentId: comment.id },
      {
        // 그사이 명의가 바뀌었으면 새 명의의 목록은 그대로 두고 접수만 알림
        onSuccess: () => (isViewer(reportedAs) ? hideReported(comment) : toast(text.reported)),
        onError: (error) => {
          // 그사이 지워진 댓글이면 목록을 맞춤(번들이 사라졌으면 다시 받은 목록이 알려 떠남)
          if (codeOf(error) === 'RESOURCE_001') {
            thread.restart();
            return;
          }
          failAction(error);
        },
      },
    );
  };

  // 내 댓글 더보기(Figma `5367:121393`): 「삭제」/「취소」. 시트가 다 닫힌 뒤 확인 창(`5367:121647`)
  const openCommentMenu = (comment: FeedComment) => {
    let chosen = false;
    openOverlay(
      (rootProps, close) => (
        <MoreMenuSheet
          {...rootProps}
          title={text.commentMenuTitle}
          cancelLabel={text.cancel}
          items={[
            {
              id: 'delete',
              label: text.deleteComment,
              tone: 'danger',
              leftIcon: <LineTrashcanMediumIcon aria-hidden />,
              onSelect: () => {
                chosen = true;
                close();
              },
            },
          ]}
        />
      ),
      () => {
        if (chosen) openDeleteConfirm(comment);
      },
    );
  };

  return {
    announcement,
    draft,
    setDraft,
    placeholder,
    submit,
    replyAuthor: replyTarget?.author ?? null,
    startReply: (comment: FeedComment) =>
      asBunch(() => {
        setReplyTarget({ id: comment.id, author: comment.author });
        focusInput();
      }),
    // 닫기 버튼이 사라지므로 초점을 입력란으로
    cancelReply: () => {
      setReplyTarget(null);
      focusInput();
    },
    openCommentMenu,
    openReportMenu: (comment: FeedComment) =>
      report.openReportMenu(text.commentMenuTitle, () => reportComment(comment)),
  };
}
