// Figma 7982:51780: 어떤 크기든 약 2px만 줄도록 (기준 − 2) ÷ 기준, 기준 = max(높이, 너비 ÷ 4, 24)
const SHRINK_PX = 2;
const MIN_BASE = 24;

/** 누른 요소의 크기로 줄어드는 비율(레이아웃 크기라 이미 줄어든 중에도 같은 값) */
export const pressScaleFor = (width: number, height: number) => {
  const base = Math.max(height, width / 4, MIN_BASE);
  return (base - SHRINK_PX) / base;
};
