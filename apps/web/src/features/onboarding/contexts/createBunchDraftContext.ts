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
  /** 만들기를 마친 번치의 이름. 완료 화면이 입력값을 비운 뒤에도 다시 들어오면 같은 화면을 보이게 한다. 아직 마치지 않았으면 null */
  createdName: string | null;
  /** 입력값을 모두 비움(번치 만들기를 그만둘 때). 마쳤다는 기록도 지운다 */
  reset: () => void;
  /** 만들기를 마쳤음을 기록하고 입력값을 비움(완료 화면에서 한 번) */
  finish: (_createdName: string) => void;
};

export const CreateBunchDraftContext = createContext<CreateBunchDraft | null>(null);

export function useCreateBunchDraft() {
  const draft = useContext(CreateBunchDraftContext);
  if (!draft) throw new Error('useCreateBunchDraft는 CreateBunchDraftProvider 안에서 써야 합니다.');
  return draft;
}
