/** 웹이 직접 자르는 원본의 긴 변 상한. 프로필 결과(512px)보다 충분히 크고 base64 전송 상한(4MiB) 안에 들어감 */
export const MAX_GALLERY_EDGE = 2048;

/** 긴 변이 상한을 넘으면 그 변만 줄일 크기, 넘지 않으면 null(비율은 manipulator가 유지) */
export function fitLongEdge(
  width: number,
  height: number,
  max = MAX_GALLERY_EDGE,
): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}
