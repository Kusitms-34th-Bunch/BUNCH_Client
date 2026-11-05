import { useSyncExternalStore } from 'react';
import type { BunchHomeDetail } from '../lib/types';

/** 프로필 편집으로 바꾼 값(번치 ID별) */
export type BunchProfileEdit = Pick<
  BunchHomeDetail,
  'name' | 'description' | 'isPrivate' | 'imageSrc'
>;
type Edits = Readonly<Record<string, BunchProfileEdit>>;

// 번치 API 연결 전 프로필 편집 결과를 번치 홈에 반영하는 임시 저장소(메모리, 새로고침하면 사라짐)
// 사진은 data URL이라 크기 때문에 sessionStorage에 두지 않음. 연결하면 저장 mutation과 번치 query 갱신으로 대체
const EMPTY: Edits = {};
let edits: Edits = EMPTY;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const saveEdit = (bunchId: string, edit: BunchProfileEdit) => {
  edits = { ...edits, [bunchId]: edit };
  listeners.forEach((listener) => listener());
};

/** 번치별 편집 값과 저장 함수. 서버 렌더는 빈 값 */
export function useBunchProfileEdits(): readonly [Edits, typeof saveEdit] {
  return [
    useSyncExternalStore(
      subscribe,
      () => edits,
      () => EMPTY,
    ),
    saveEdit,
  ];
}
