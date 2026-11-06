import { createContext, useContext } from 'react';
import type { DraftActions, DraftState } from '../hooks/useDraft';

export type DraftContextValue = {
  state: DraftState;
  actions: DraftActions;
};

export const DraftContext = createContext<DraftContextValue | undefined>(undefined);

/** 작성 화면과 참여 멤버 관리 화면이 같은 초안 상태를 보도록 `DraftProvider`가 내려주는 값 */
export const useDraftContext = (): DraftContextValue => {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useDraftContext는 DraftProvider 안에서만 쓸 수 있어요.');
  return value;
};
