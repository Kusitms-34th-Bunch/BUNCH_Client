'use client';

import type { ReactNode } from 'react';
import { useDraft } from '../hooks/useDraft';
import { DraftContext } from './draftContext';

type DraftProviderProps = {
  /** route에서 형식을 검증한 초안 id. 형식이 틀렸으면 undefined */
  draftId: string | undefined;
  children: ReactNode;
};

/**
 * `/bunch/drafts/[draftId]` layout이 감싸는 초안 상태: 작성 화면과 참여 멤버 관리 화면을 오가도 같은 초안을 봄
 * 이 초안 흐름을 벗어나면 사라지고, 초안 API 연결 전에는 fixture와 메모리 상태
 */
export function DraftProvider({ draftId, children }: DraftProviderProps) {
  const value = useDraft(draftId);
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}
