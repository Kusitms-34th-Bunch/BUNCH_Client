'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { usePreservedCallback } from 'react-simplikit';
import { useAccessNoticeDialog } from '../../hooks/useAccessNoticeDialog';
import {
  bunchAccessNoticeQueryOptions,
  useDeleteBunchNoticeMutation,
} from '../../queries/bunchHome';

type AccessNoticeDialogProps = {
  /** 서버가 준 안내 ID(`BUNCH_008`의 detail, 알림 `ACCESS_NOTICE`의 대상) */
  noticeId: string;
  /** 안내 창이 닫힘 */
  onClosed: () => void;
  /** 안내를 받지 못함(이미 확인했거나 30일이 지남, 네트워크) */
  onFailed: () => void;
};

/** 안내 ID로 삭제·내보내진 번치 안내를 받아 안내 창을 한 번 띄움. 그리는 것은 없음 */
export function AccessNoticeDialog({ noticeId, onClosed, onFailed }: AccessNoticeDialogProps) {
  const { data: notice, isError } = useQuery(bunchAccessNoticeQueryOptions(noticeId));
  const openNotice = useAccessNoticeDialog();
  const deleteNotice = useDeleteBunchNoticeMutation();
  const shown = useRef<string | undefined>(undefined);
  const closed = usePreservedCallback(onClosed);
  const failed = usePreservedCallback(onFailed);
  const remove = usePreservedCallback(() => deleteNotice.mutate(noticeId));
  const open = usePreservedCallback(openNotice);

  useEffect(() => {
    if (shown.current === noticeId) return;
    if (isError) {
      shown.current = noticeId;
      failed();
      return;
    }
    if (!notice) return;
    shown.current = noticeId;
    open(notice, { onRemove: remove, onClosed: () => closed() });
  }, [noticeId, notice, isError, open, remove, closed, failed]);

  return null;
}
