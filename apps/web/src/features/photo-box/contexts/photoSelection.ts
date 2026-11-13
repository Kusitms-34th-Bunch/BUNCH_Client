import { createContext, useContext, useSyncExternalStore } from 'react';
import { type PhotoSelection, getSelectionOrder } from '../lib/selection';

// 선택 상태의 context·저장소와 읽는 hook(provider는 PhotoSelectionContext.tsx, 컴포넌트 파일과 나눠 Fast Refresh 유지)

export type PhotoSelectionValue = {
  /** 선택 모드 여부 */
  active: boolean;
  /** 누른 순서대로 담은 선택한 사진 id */
  selection: PhotoSelection;
  onToggle: (_photoId: string) => void;
};

type SelectionActions = Pick<PhotoSelectionValue, 'active' | 'onToggle'>;

/** 선택 목록을 담는 작은 저장소: 사진 칸이 자기 번호만 구독해, 한 장을 눌러도 그 사진 칸만 다시 그려짐 */
export type SelectionStore = {
  getSnapshot: () => PhotoSelection;
  set: (_selection: PhotoSelection) => void;
  subscribe: (_listener: () => void) => () => void;
};

export const createStore = (initial: PhotoSelection): SelectionStore => {
  let selection = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => selection,
    set: (next) => {
      selection = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

const emptyStore = createStore([]);

// 모든 사진 칸이 쓰는 값은 선택 모드 여부와 토글 함수뿐이라 선택이 바뀌어도 참조가 그대로여야 칸들이 다시 그려지지 않음
export const ActionsContext = createContext<SelectionActions>({
  active: false,
  onToggle: () => {},
});
export const StoreContext = createContext<SelectionStore>(emptyStore);

/** 선택 모드 여부와 토글 함수만 필요할 때(선택이 바뀌어도 다시 그려지지 않음) */
export const usePhotoSelectionActions = () => useContext(ActionsContext);

/** 사진 하나의 선택 번호(1부터, 선택 전이면 undefined). 그 사진의 번호가 바뀔 때만 다시 그려짐 */
export const usePhotoOrder = (photoId: string): number | undefined => {
  const store = useContext(StoreContext);
  const getOrder = () => getSelectionOrder(store.getSnapshot(), photoId);
  return useSyncExternalStore(store.subscribe, getOrder, getOrder);
};

/** 선택 모드 여부·선택 목록·토글 함수 전부(선택이 바뀔 때마다 다시 그려지므로 꼭 필요한 곳에서만 사용) */
export const usePhotoSelection = (): PhotoSelectionValue => {
  const { active, onToggle } = useContext(ActionsContext);
  const store = useContext(StoreContext);
  const selection = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { active, selection, onToggle };
};
