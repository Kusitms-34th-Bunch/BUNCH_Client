/** 사진 조정 화면의 원 지름(Figma 사진변경 252px)과 결과 이미지 한 변 */
export const CROP_DIAMETER = 252;
export const CROP_OUTPUT_SIZE = 512;

type Size = { width: number; height: number };
type Offset = { x: number; y: number };

/** 화면 폭을 채우되 원을 항상 덮도록 키운 배율(Figma: 사진을 화면 폭에 맞춤) */
export const fitScale = (image: Size, stageWidth: number, diameter = CROP_DIAMETER) =>
  Math.max(stageWidth / image.width, diameter / image.height, diameter / image.width);

/** 원이 사진 밖으로 나가지 않게 이동량 제한(가운데 정렬 기준 오프셋) */
export const clampOffset = (
  offset: Offset,
  image: Size,
  scale: number,
  diameter = CROP_DIAMETER,
) => {
  const maxX = Math.max(0, (image.width * scale - diameter) / 2);
  const maxY = Math.max(0, (image.height * scale - diameter) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
};

/** 원이 덮는 원본 사진의 정사각 영역(원본 px). 오프셋은 사진을 옮긴 거리라 원 위치는 반대 방향 */
export const cropSourceRect = (
  image: Size,
  scale: number,
  offset: Offset,
  diameter = CROP_DIAMETER,
) => {
  const size = diameter / scale;
  return {
    x: image.width / 2 - offset.x / scale - size / 2,
    y: image.height / 2 - offset.y / scale - size / 2,
    size,
  };
};
