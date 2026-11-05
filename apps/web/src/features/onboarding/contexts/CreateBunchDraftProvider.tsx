'use client';

import { useCallback, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CreateBunchDraftContext, type Mood, type Visibility } from './createBunchDraftContext';

// create layout에서 단계 간 임시 입력값 유지. 새로고침이나 흐름 이탈 시 초기화
export function CreateBunchDraftProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /** 테스트에서 앞 단계를 마친 상태로 시작하기 위한 초기값 */
  initial?: Partial<{
    name: string;
    visibility: Visibility;
    description: string;
    mood: Mood;
    createdName: string;
  }>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [visibility, setVisibility] = useState<Visibility | null>(initial?.visibility ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [createdName, setCreatedName] = useState<string | null>(initial?.createdName ?? null);

  // 이전 완료 후 새로 입력할 때 옛 이름이 완료 화면에 남는 현상 방지
  const edits =
    <T,>(set: Dispatch<SetStateAction<T>>): Dispatch<SetStateAction<T>> =>
    (value) => {
      setCreatedName(null);
      set(value);
    };

  // 완료 화면 effect의 불필요한 재실행 방지를 위한 함수 참조 유지
  const reset = useCallback(() => {
    setName('');
    setVisibility(null);
    setDescription('');
    setMood(null);
    setCreatedName(null);
  }, []);

  const finish = useCallback((name: string) => {
    setName('');
    setVisibility(null);
    setDescription('');
    setMood(null);
    setCreatedName(name);
  }, []);

  return (
    <CreateBunchDraftContext
      value={{
        name,
        setName: edits(setName),
        visibility,
        setVisibility: edits(setVisibility),
        description,
        setDescription: edits(setDescription),
        mood,
        setMood: edits(setMood),
        createdName,
        reset,
        finish,
      }}
    >
      {children}
    </CreateBunchDraftContext>
  );
}
