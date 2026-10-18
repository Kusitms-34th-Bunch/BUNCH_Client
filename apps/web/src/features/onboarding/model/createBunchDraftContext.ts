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
  /** 입력값을 모두 비움(번치 만들기를 그만둘 때) */
  reset: () => void;
};

export const CreateBunchDraftContext = createContext<CreateBunchDraft | null>(null);

export function useCreateBunchDraft() {
  const draft = useContext(CreateBunchDraftContext);
  if (!draft) throw new Error('useCreateBunchDraft는 CreateBunchDraftProvider 안에서 써야 합니다.');
  return draft;
}
