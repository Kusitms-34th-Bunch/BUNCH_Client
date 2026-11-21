'use client';

import { isApiError } from '@app/api-core';
import { ConfirmDialog, LineTrashcanMediumIcon, toast } from '@app/design-system';
import { MoreMenuSheet } from '@app/design-system/web';
import { useState, type RefObject } from 'react';
import { isWireId } from '@/shared/api/ids';
import { prohibitedFieldsOf } from '@/shared/api/prohibitedWord';
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
  asBunch: (_action: () => void) => void;
  report: ReturnType<typeof useBundleReport>;
  /** 댓글 등록·삭제·신고의 공통 실패 처리 */
  failAction: (_error: unknown) => void;
  focusInput: () => void;
  commentsRef: RefObject<HTMLElement | null>;
};

/**
 * 번들 상세 댓글 동작(명세 014~019): 입력 초안·답글 대상, 등록, 내 댓글 삭제, 남의 댓글 신고(숨기지 않고 접수 안내만)
 * 결과 안내·초점은 `useCommentFeedback`
 */
export function useCommentActions({
  thread,
  viewer,
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
          // 금칙어: 등록하지 않고 쓴 내용·답글 작성 상태를 그대로 둔 채 안내(기능명세 6.2.8)
          if (prohibitedFieldsOf(error)) {
            toast(text.prohibitedWord);
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
    report.openReport(
      text.reportCommentTitle,
      { commentId: comment.id },
      {
        // 신고만으로는 숨기지 않음(운영 검토 뒤 위반이면 삭제, 기능명세 6.2.14 2026-11-21 변경)
        onSuccess: () => toast(text.reported),
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
    // 답글 상태만 풂(키보드를 띄우지 않음). 사라진 닫기 버튼의 초점은 화면이 옮김
    cancelReply: () => setReplyTarget(null),
    openCommentMenu,
    openReportMenu: (comment: FeedComment) =>
      report.openReportMenu(text.commentMenuTitle, () => reportComment(comment)),
  };
}
