'use client';

import type { ReactNode } from 'react';
import { useBundleEdit } from '../hooks/useBundleEdit';
import { BundleEditContext } from './bundleEditContext';

type BundleEditProviderProps = {
  bunchId: string;
  bundleId: string;
  children: ReactNode;
};

/**
 * 발행 번들 수정 흐름(수정 화면 → 사진 추가 화면)의 편집 값을 route layout에서 한 번 들고 있는 provider
 * 사진 추가 화면에 갔다 와도 고친 내용이 유지되고, 이 흐름을 벗어나면 함께 사라져 저장하지 않은 내용을 버림
 */
export function BundleEditProvider({ bunchId, bundleId, children }: BundleEditProviderProps) {
  const { state, actions } = useBundleEdit(bunchId, bundleId);
  return (
    <BundleEditContext.Provider value={{ bunchId, bundleId, state, actions }}>
      {children}
    </BundleEditContext.Provider>
  );
}
