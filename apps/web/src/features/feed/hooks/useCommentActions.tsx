'use client';

import { isApiError } from '@app/api-core';
import { ConfirmDialog, LineTrashcanMediumIcon, toast } from '@app/design-system';
import { MoreMenuSheet } from '@app/design-system/web';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { isWireId } from '@/shared/api/ids';
import { prohibitedFieldsOf } from '@/shared/api/prohibitedWord';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import type { FeedComment, FeedViewer } from '../lib/types';
import type { useBundleComments } from './useBundleComments';
import type { useBundleReport } from './useBundleReport';
import { FEED_MESSAGES as text } from '../constants/messages';
import { badgeColorOf } from '../lib/comments';
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
 * 등록은 약한 낙관 반영: 보내면 입력란을 비우고 「등록 중…」 내 댓글을 화면에만 먼저 보임. 수·캐시는 응답 뒤에만 바꾸고, 실패하면 쓴 글을 되돌림
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
  // 보낸 뒤 응답 전까지 화면에만 먼저 보일 내 댓글
  // 보낸 당시 명의(그사이 번치를 바꾸면 그리지 않음)
  const [pending, setPending] = useState<{
    content: string;
    parentId: string | null;
    viewer: NonNullable<FeedViewer>;
  } | null>(null);
  // 응답이 왔을 때 다음 글을 쓰는 중인지(쓰는 중이면 초점을 빼앗지 않음)
  const draftRef = useRef(draft);
  const replyTargetRef = useRef(replyTarget);
  useEffect(() => {
    draftRef.current = draft;
    replyTargetRef.current = replyTarget;
  });
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
      // 앞의 댓글을 기다리는 중: 쓴 글은 두고 안내(조용히 무시하면 보내기가 고장난 것처럼 보임)
      if (pending) {
        toast(text.previousCommentPosting);
        return;
      }
      const target = replyTarget;
      const parentId = target?.id ?? null;
      const started = thread.create(content, parentId, {
        onSuccess: (saved) => {
          setPending(null);
          announce(parentId ? text.replyAdded : text.commentAdded);
          // 다음 글을 쓰거나 다른 답글을 고른 중이면 초점을 옮기지 않음(키보드가 내려가고 답글 상태가 풀리지 않게)
          if (draftRef.current.trim() === '' && replyTargetRef.current === null) {
            focusAfterUpdate(String(saved.id));
          }
        },
        // 실패하면 먼저 보인 댓글을 빼고 쓴 글을 입력란에 되돌림
        // 그사이 새 글을 쓰거나 다른 답글을 골랐으면 그 상태는 두고 글만 앞에 붙임(글과 답글 대상이 엇갈려 짝지어지지 않게)
        onError: (error) => {
          setPending(null);
          const untouched = draftRef.current.trim() === '' && replyTargetRef.current === null;
          setDraft(draftRef.current.trim() ? `${value}\n${draftRef.current}` : value);
          // 답글 대상이 그사이 지워졌거나 숨겨짐: 답글 상태는 되돌리지 않고 목록을 맞춤(번들이 사라졌으면 다시 받은 목록이 알려 떠남)
          if (codeOf(error) === 'BUNDLE_002' || (parentId && codeOf(error) === 'RESOURCE_001')) {
            // 기다리는 사이 같은 원댓글에 다시 답글을 눌렀으면 그 답글 상태도 풂
            if (replyTargetRef.current?.id === parentId) setReplyTarget(null);
            thread.restart();
            toast(text.replyTargetDeleted);
            return;
          }
          if (untouched) setReplyTarget(target);
          // 금칙어: 등록하지 않고 쓴 내용·답글 작성 상태를 되돌린 채 안내(기능명세 6.2.8)
          if (prohibitedFieldsOf(error)) {
            toast(text.prohibitedWord);
            return;
          }
          failAction(error);
        },
      });
      if (!started) return;
      setPending({ content, parentId, viewer });
      setDraft('');
      setReplyTarget(null);
      announce(parentId ? text.replyPostingAnnounce : text.commentPostingAnnounce);
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

  // 먼저 보일 내 댓글: 원댓글은 맨 위, 답글은 그 원댓글의 답글 끝(원댓글이 목록에 없으면 보이지 않음)
  // 목록을 받는 중·실패면 끼우지 않음(받는 중·다시 시도 안내를 가리지 않게)
  const pendingComment: FeedComment | null =
    pending && viewer?.bunchId === pending.viewer.bunchId && !thread.loading && !thread.failed
      ? {
          id: 'pending',
          author: pending.viewer.memberName ?? text.me,
          avatarSrc: pending.viewer.memberImageSrc,
          bunchName: pending.viewer.name,
          bunchColor: badgeColorOf(pending.viewer.characterType),
          date: text.commentPosting,
          content: pending.content,
          reply: pending.parentId !== null,
          parentId: pending.parentId ?? undefined,
          pending: true,
          canDelete: false,
          canReply: false,
          canReport: false,
        }
      : null;
  const shownComments = ((): readonly FeedComment[] => {
    if (!pendingComment) return comments;
    if (pending?.parentId == null) return [pendingComment, ...comments];
    const parentIndex = comments.findIndex(({ id }) => id === pending.parentId);
    if (parentIndex < 0) return comments;
    let at = parentIndex + 1;
    while (comments[at]?.parentId === pending.parentId) at += 1;
    return [...comments.slice(0, at), pendingComment, ...comments.slice(at)];
  })();

  return {
    /** 화면에 그릴 댓글(응답 전 내 댓글 포함) */
    comments: shownComments,
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
