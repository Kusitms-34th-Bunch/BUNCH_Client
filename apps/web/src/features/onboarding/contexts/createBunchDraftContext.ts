'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

export type Visibility = 'private' | 'public';
/** 분위기 선택지 id. 이름·그래픽이 확정되기 전까지 임시 id */
export type Mood = 'mood-1' | 'mood-2' | 'mood-3' | 'mood-4';

export type CreateBunchDraft = {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  visibility: Visibility | null;
  setVisibility: Dispatch<SetStateAction<Visibility | null>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  mood: Mood | null;
  setMood: Dispatch<SetStateAction<Mood | null>>;
  /** 입력값 초기화 후 완료 화면 재진입을 위한 이름. 미완료 시 null */
  createdName: string | null;
  /** 입력값과 완료 기록 초기화 */
  reset: () => void;
  /** 완료 기록 저장 후 입력값 초기화 */
  finish: (_createdName: string) => void;
};

export const CreateBunchDraftContext = createContext<CreateBunchDraft | null>(null);

export function useCreateBunchDraft() {
  const draft = useContext(CreateBunchDraftContext);
  if (!draft) throw new Error('useCreateBunchDraft는 CreateBunchDraftProvider 안에서 써야 합니다.');
  return draft;
}
