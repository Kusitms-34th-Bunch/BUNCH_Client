'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { CharacterType } from '@/shared/lib/bunchProfile';
import type { CreatedBunch } from '../api/bunches';

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
  /** 서버가 만들어 돌려준 번치. 입력값 초기화 뒤 완료·초대 화면이 쓰며, 미완료 시 null */
  createdBunch: CreatedBunch | null;
  /** 생성 요청에서 이미 사용 중이라고 거절된 이름(정규화한 값). 1단계가 중복 안내를 보여 주는 데 씀 */
  takenName: string | null;
  markNameTaken: (_name: string) => void;
  /** 입력값과 완료 기록 초기화 */
  reset: () => void;
  /** 생성 결과 저장 후 입력값 초기화 */
  finish: (_created: CreatedBunch) => void;
  /** 사진 변경 등으로 서버가 돌려준 최신 번치로 완료 기록을 바꿈 */
  updateCreatedBunch: (_created: CreatedBunch) => void;
  /**
   * 같은 입력의 재시도가 같은 멱등 키를 쓰게 함(응답이 유실돼도 번치가 둘 만들어지지 않음)
   * 입력(signature)이 바뀌면 새 키. 흐름을 떠나도 유지되도록 화면이 아닌 이 상태가 보관
   */
  idempotencyKeyFor: (_signature: string) => string;
  /** 생성 요청이 서버에서 거절되면(4xx) 같은 키의 재생을 피하려고 키를 버림 */
  discardIdempotencyKey: () => void;
};

export const CreateBunchDraftContext = createContext<CreateBunchDraft | null>(null);

export function useCreateBunchDraft() {
  const draft = useContext(CreateBunchDraftContext);
  if (!draft) throw new Error('useCreateBunchDraft는 CreateBunchDraftProvider 안에서 써야 합니다.');
  return draft;
}
