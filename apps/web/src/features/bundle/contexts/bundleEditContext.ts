import { createContext, useContext } from 'react';
import type { BundleEditActions, BundleEditState } from '../hooks/useBundleEdit';

export type BundleEditContextValue = {
  bunchId: string;
  bundleId: string;
  state: BundleEditState;
  actions: BundleEditActions;
};

export const BundleEditContext = createContext<BundleEditContextValue | undefined>(undefined);

/** 수정 화면과 수정 중 사진 추가 화면이 같은 편집 상태를 보도록 `BundleEditProvider`가 내려주는 값 */
export const useBundleEditContext = (): BundleEditContextValue => {
  const value = useContext(BundleEditContext);
  if (!value) throw new Error('useBundleEditContext는 BundleEditProvider 안에서만 쓸 수 있어요.');
  return value;
};
