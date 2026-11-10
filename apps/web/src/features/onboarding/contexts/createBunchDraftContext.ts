'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { CharacterType } from '@/shared/lib/bunchProfile';

export type Visibility = 'private' | 'public';
/** 번치 성격 선택지. 서버 캐릭터 타입과 같은 값 */
export type Mood = CharacterType;

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
  /** 완료 화면 기본 대표 이미지를 정하는 성격 기록. 미완료 시 null */
  createdMood: Mood | null;
  /** 입력값과 완료 기록 초기화 */
  reset: () => void;
  /** 완료 기록(이름·성격) 저장 후 입력값 초기화 */
  finish: (_createdName: string, _createdMood: Mood | null) => void;
};

export const CreateBunchDraftContext = createContext<CreateBunchDraft | null>(null);

export function useCreateBunchDraft() {
  const draft = useContext(CreateBunchDraftContext);
  if (!draft) throw new Error('useCreateBunchDraft는 CreateBunchDraftProvider 안에서 써야 합니다.');
  return draft;
}
