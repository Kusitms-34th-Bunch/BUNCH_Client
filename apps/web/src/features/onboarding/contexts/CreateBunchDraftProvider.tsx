'use client';

import { useCallback, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CreateBunchDraftContext, type Mood, type Visibility } from './createBunchDraftContext';

/**
 * 번치 만들기 단계들이 함께 쓰는 입력값 임시 보관
 * create 폴더의 layout이 소유해 단계를 오가는 동안 유지되고, 새로고침하거나 흐름을 벗어나면 사라진다
 */
export function CreateBunchDraftProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /** 처음 값. 테스트에서 앞 단계를 마친 상태로 시작할 때 쓴다 */
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

  // 만들기를 마친 뒤 뒤로 가서 새로 입력하기 시작하면 이전 완료 기록을 버린다(옛 이름이 새 완료 화면에 나오지 않게)
  const edits =
    <T,>(set: Dispatch<SetStateAction<T>>): Dispatch<SetStateAction<T>> =>
    (value) => {
      setCreatedName(null);
      set(value);
    };

  // 완료 화면의 effect가 의존하므로 setter(안정적)만 써서 identity를 고정한다
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
