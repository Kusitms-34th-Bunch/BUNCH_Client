'use client';

import { createContext, useContext } from 'react';

type PhotoDragContextValue = {
  /** 끌어서 날짜를 옮길 수 있는 상태(선택 모드이고 사진함이 DndContext 안에 있음) */
  enabled: boolean;
  /** 끌 수 있는 사진 id(권한이 없거나 처리 중인 사진은 제외) */
  draggableIds: ReadonlySet<string>;
};

const PhotoDragContext = createContext<PhotoDragContextValue>({
  enabled: false,
  draggableIds: new Set(),
});

/** 날짜 섹션과 사진 칸까지 끌기 상태를 내려 주는 provider */
export const PhotoDragProvider = PhotoDragContext.Provider;

export const usePhotoDrag = () => useContext(PhotoDragContext);
