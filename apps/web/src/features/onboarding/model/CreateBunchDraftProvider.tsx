'use client';

import { useState, type ReactNode } from 'react';
import { CreateBunchDraftContext, type Mood, type Visibility } from './createBunchDraftContext';

/**
 * 번치 만들기 단계들이 함께 쓰는 입력값 임시 보관
 * create 폴더의 layout이 소유해 단계를 오가는 동안 유지되고, 새로고침하거나 흐름을 벗어나면 사라진다
 */
export function CreateBunchDraftProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);

  const reset = () => {
    setName('');
    setVisibility(null);
    setDescription('');
    setMood(null);
  };

  return (
    <CreateBunchDraftContext
      value={{
        name,
        setName,
        visibility,
        setVisibility,
        description,
        setDescription,
        mood,
        setMood,
        reset,
      }}
    >
      {children}
    </CreateBunchDraftContext>
  );
}
