/**
 * 선택 모드를 끝낸 직후의 완료 토스트를 하단 탭 막대 위 8px에 두기 위한 추가 간격(px)
 * 토스트 기본 위치는 Safe Area + 16px이므로, 막대 영역 80px + 간격 8px − 16px = 72px를 더 올림(Figma 사진함_11·12의 토스트와 막대 사이 8px)
 * 값은 `(main)/layout.tsx`의 막대 높이(5rem)와 같은 기준
 */
export const TOAST_ABOVE_TAB_BAR_OFFSET = 72;
