'use client';

import { toast } from '@app/design-system';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FeedComment } from '../lib/types';

const ANNOUNCE_CLEAR_MS = 5000;

/**
 * 댓글 등록·삭제·신고 결과 안내: 상태 영역 문구와, 목록이 반영된 뒤 옮길 초점·띄울 토스트
 * 초점 대상이 사라졌으면(숨긴 댓글) 댓글 영역으로
 */
export function useCommentFeedback(
  comments: readonly FeedComment[],
  commentsRef: RefObject<HTMLElement | null>,
) {
  const [announcement, setAnnouncement] = useState('');
  // 같은 문구를 이어서 알려도 다시 읽히도록 끝에 보이지 않는 공백을 번갈아 붙임
  // 몇 초 뒤 비워, 뒤이은 받는 중 안내가 읽히고 끝난 뒤 지난 안내로 돌아가지 않게 함
  const announceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(announceTimer.current), []);
  const announce = (message: string) => {
    setAnnouncement((current) => (current === message ? `${message}\u00a0` : message));
    clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(''), ANNOUNCE_CLEAR_MS);
  };
  // 등록·삭제가 반영된 뒤 초점을 옮길 댓글
  const focusCommentId = useRef<string | null>(null);
  // 지운 결과(답글 상태 해제로 입력란 높이도 바뀜)가 그려진 뒤 띄울 토스트
  const pendingToast = useRef<string | null>(null);
  const focusAfterUpdate = (commentId: string, toastMessage?: string) => {
    focusCommentId.current = commentId;
    if (toastMessage) pendingToast.current = toastMessage;
  };

  // 등록·삭제한 댓글로 초점을 옮김(키보드를 내리고 결과 자리를 알림)
  useEffect(() => {
    const id = focusCommentId.current;
    if (!id) return;
    focusCommentId.current = null;
    // 숨겨 사라진 댓글이면 댓글 영역으로
    const item = document.getElementById(`comment-${id}`) ?? commentsRef.current;
    item?.scrollIntoView?.({ block: 'nearest' });
    item?.focus({ preventScroll: true });
    const message = pendingToast.current;
    if (!message) return;
    pendingToast.current = null;
    toast(message);
  }, [comments, commentsRef]);

  return { announcement, announce, focusAfterUpdate };
}
