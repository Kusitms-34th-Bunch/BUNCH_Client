'use client';

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import type { CreatedBunch } from '../api/bunches';
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
    createdBunch: CreatedBunch;
  }>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [visibility, setVisibility] = useState<Visibility | null>(initial?.visibility ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [mood, setMood] = useState<Mood | null>(initial?.mood ?? null);
  const [createdBunch, setCreatedBunch] = useState<CreatedBunch | null>(
    initial?.createdBunch ?? null,
  );
  const [takenName, setTakenName] = useState<string | null>(null);
  const attempt = useRef<{ signature: string; key: string } | undefined>(undefined);

  // 이전 완료 후 새로 입력할 때 옛 번치가 완료 화면에 남는 현상 방지
  const edits =
    <T,>(set: Dispatch<SetStateAction<T>>): Dispatch<SetStateAction<T>> =>
    (value) => {
      setCreatedBunch(null);
      set(value);
    };

  // 완료 화면 effect의 불필요한 재실행 방지를 위한 함수 참조 유지
  const reset = useCallback(() => {
    setName('');
    setVisibility(null);
    setDescription('');
    setMood(null);
    setCreatedBunch(null);
    setTakenName(null);
    attempt.current = undefined;
  }, []);

  const finish = useCallback((created: CreatedBunch) => {
    setName('');
    setVisibility(null);
    setDescription('');
    setMood(null);
    setCreatedBunch(created);
    setTakenName(null);
    // 성공한 요청의 키는 다음 번치 만들기에 쓰지 않음
    attempt.current = undefined;
  }, []);

  const idempotencyKeyFor = useCallback((signature: string) => {
    if (attempt.current?.signature !== signature) {
      attempt.current = { signature, key: createIdempotencyKey() };
    }
    return attempt.current.key;
  }, []);

  const discardIdempotencyKey = useCallback(() => {
    attempt.current = undefined;
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
        createdBunch,
        takenName,
        markNameTaken: setTakenName,
        reset,
        finish,
        updateCreatedBunch: setCreatedBunch,
        idempotencyKeyFor,
        discardIdempotencyKey,
      }}
    >
      {children}
    </CreateBunchDraftContext>
  );
}
