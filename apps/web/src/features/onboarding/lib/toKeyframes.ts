/** [시각(0~1), 값, 다음 키프레임까지의 곡선] */
export type KeyframeStep = readonly [offset: number, value: number | string, easing?: string];

/** Figma 키프레임 표를 Web Animations 키프레임으로 변환 */
export const toKeyframes = (steps: readonly KeyframeStep[], property: string): Keyframe[] =>
  steps.map(([offset, value, easing]) => ({
    offset,
    [property]: value,
    ...(easing ? { easing } : {}),
  }));
