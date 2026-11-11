/** 자른 결과 이미지 한 변 */
export const CROP_OUTPUT_SIZE = 512;
/** 칸 한 변의 최소 길이(화면 px). 손가락으로 잡을 수 있는 크기 */
export const MIN_CROP_DISPLAY_SIZE = 80;

type Size = { width: number; height: number };
type Point = { x: number; y: number };
/** 칸(원본 사진 px, 왼쪽 위 기준). 비율은 자유이고 원은 칸 안에 꽉 차게 들어감. 화면 크기가 바뀌어도 같은 부분을 가리킴 */
export type Crop = { x: number; y: number; width: number; height: number };
/** 끄는 모서리 방향(-1 왼쪽·위, 1 오른쪽·아래) */
export type Corner = { x: -1 | 1; y: -1 | 1 };

/**
 * 사진을 조정 영역 안에 통째로 보이게 줄이는 배율(Figma 사진변경 5878:90300·6501:138753: 화면 폭에 맞춤)
 * 세로로 아주 긴 사진은 영역 높이에 맞춤
 */
export const fitScale = (image: Size, stage: Size) => {
  const scale = Math.min(stage.width / image.width, stage.height / image.height);
  // 영역을 아직 재지 못했거나(0) 크기 없는 사진이면 0: 화면은 칸을 그리지 않고 완료를 막음
  return Number.isFinite(scale) && scale > 0 ? scale : 0;
};

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** 한 변의 최소 길이(원본 px). 사진이 그보다 작으면 사진 길이까지 */
const minSide = (length: number, scale: number) => Math.min(length, MIN_CROP_DISPLAY_SIZE / scale);

/**
 * 처음 칸: 사진 폭 전체 × 짧은 쪽 높이, 세로 가운데(Figma)
 * 가로 사진은 사진 전체, 세로 사진은 폭만 한 정사각형
 */
export const initialCrop = (image: Size): Crop => {
  const height = Math.min(image.width, image.height);
  return { x: 0, y: (image.height - height) / 2, width: image.width, height };
};

/** 칸이 사진 밖으로 나가지 않고 최소 크기 이상이게 맞춤 */
export const clampCrop = (crop: Crop, image: Size, scale: number): Crop => {
  const width = clampValue(crop.width, minSide(image.width, scale), image.width);
  const height = clampValue(crop.height, minSide(image.height, scale), image.height);
  return {
    x: clampValue(crop.x, 0, image.width - width),
    y: clampValue(crop.y, 0, image.height - height),
    width,
    height,
  };
};

/** 칸을 옮김(원본 px) */
export const moveCrop = (crop: Crop, delta: Point, image: Size, scale: number) =>
  clampCrop({ ...crop, x: crop.x + delta.x, y: crop.y + delta.y }, image, scale);

/** 가운데와 비율을 그대로 두고 크기만 바꿈(키보드 +·-). `factor`는 배율 */
export const resizeCropBy = (crop: Crop, factor: number, image: Size, scale: number) => {
  const width = clampValue(crop.width * factor, minSide(image.width, scale), image.width);
  const height = clampValue(crop.height * factor, minSide(image.height, scale), image.height);
  const center = { x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 };
  return clampCrop(
    { x: center.x - width / 2, y: center.y - height / 2, width, height },
    image,
    scale,
  );
};

/**
 * 모서리를 끌어 크기를 바꿈: 반대 모서리를 고정하고 가로·세로를 따로 바꿈(좌우로 끌면 폭만, 위아래면 높이만, 대각선이면 둘 다)
 * `point`는 손가락 위치(원본 px). 사진 밖으로는 넘지 않음
 */
export const resizeCropFromCorner = (
  crop: Crop,
  corner: Corner,
  point: Point,
  image: Size,
  scale: number,
): Crop => {
  const anchor = {
    x: corner.x === 1 ? crop.x : crop.x + crop.width,
    y: corner.y === 1 ? crop.y : crop.y + crop.height,
  };
  const width = clampValue(
    corner.x * (point.x - anchor.x),
    minSide(image.width, scale),
    corner.x === 1 ? image.width - anchor.x : anchor.x,
  );
  const height = clampValue(
    corner.y * (point.y - anchor.y),
    minSide(image.height, scale),
    corner.y === 1 ? image.height - anchor.y : anchor.y,
  );
  return {
    x: corner.x === 1 ? anchor.x : anchor.x - width,
    y: corner.y === 1 ? anchor.y : anchor.y - height,
    width,
    height,
  };
};

/** 원이 덮는 정사각 영역(원본 px): 칸의 짧은 쪽, 칸 가운데. 이 영역을 잘라 프로필 사진으로 씀 */
export const circleSquare = (crop: Crop) => {
  const size = Math.min(crop.width, crop.height);
  return {
    x: crop.x + (crop.width - size) / 2,
    y: crop.y + (crop.height - size) / 2,
    size,
  };
};

/** 고무줄: 끝을 넘은 손가락 거리 중 따라가는 비율(놓으면 끝으로 돌아감) */
export const RUBBER_BAND = 0.25;

/** 제한하지 않은 칸 옮기기(끝을 넘은 만큼은 고무줄로 보여 줄 때 씀) */
export const moveCropRaw = (crop: Crop, delta: Point): Crop => ({
  ...crop,
  x: crop.x + delta.x,
  y: crop.y + delta.y,
});

/** 제한하지 않은 모서리 크기 조절(반대 모서리 고정). 한 변은 1px 아래로 내려가지 않음 */
export const resizeCropFromCornerRaw = (crop: Crop, corner: Corner, point: Point): Crop => {
  const anchor = {
    x: corner.x === 1 ? crop.x : crop.x + crop.width,
    y: corner.y === 1 ? crop.y : crop.y + crop.height,
  };
  const width = Math.max(1, corner.x * (point.x - anchor.x));
  const height = Math.max(1, corner.y * (point.y - anchor.y));
  return {
    x: corner.x === 1 ? anchor.x : anchor.x - width,
    y: corner.y === 1 ? anchor.y : anchor.y - height,
    width,
    height,
  };
};

/** 끄는 동안 보여 줄 칸: 제한한 값에서 넘친 거리의 일부만 더함 */
export const rubberBand = (raw: Crop, clamped: Crop, factor = RUBBER_BAND): Crop => ({
  x: clamped.x + (raw.x - clamped.x) * factor,
  y: clamped.y + (raw.y - clamped.y) * factor,
  width: clamped.width + (raw.width - clamped.width) * factor,
  height: clamped.height + (raw.height - clamped.height) * factor,
});
