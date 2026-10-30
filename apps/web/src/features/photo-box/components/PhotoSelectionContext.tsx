'use client';

import { createContext, useContext } from 'react';
import type { PhotoSelection } from '../lib/selection';

type PhotoSelectionContextValue = {
  /** 선택 모드 여부 */
  active: boolean;
  /** 누른 순서대로 담은 선택한 사진 id */
  selection: PhotoSelection;
  /** 앨범에 저장하는 중인 사진 id(사진마다 점 3개 로딩) */
  savingIds: PhotoSelection;
  onToggle: (_photoId: string) => void;
};

const PhotoSelectionContext = createContext<PhotoSelectionContextValue>({
  active: false,
  selection: [],
  savingIds: [],
  onToggle: () => {},
});

/** 날짜 섹션·아코디언·격자를 지나 사진 칸까지 선택 상태를 내려 주는 provider(prop drilling 방지) */
export const PhotoSelectionProvider = PhotoSelectionContext.Provider;

export const usePhotoSelection = () => useContext(PhotoSelectionContext);
