/** 웹이 직접 자르는 원본의 긴 변 상한. 프로필 결과(512px)보다 충분히 크고 base64 전송 상한(4MiB) 안에 들어감 */
export const MAX_GALLERY_EDGE = 2048;

/** 사진함에 올리는 사진의 긴 변 상한(기능명세서 3.2.2). 서버는 긴 변 4096px 이하만 받음 */
export const MAX_UPLOAD_EDGE = 2560;

/**
 * 업로드용 JPEG의 목표 크기. 서버 상한이 문서마다 달라(보안 문서는 파일 6MB·요청 7MB, 업로드 API 명세는 30MiB)
 * 더 작은 쪽인 6MB보다 여유 있게 잡음. 백엔드가 확정하면 이 값을 맞춤
 */
export const UPLOAD_TARGET_BYTES = 5.5 * 1024 * 1024;

/** 압축 품질 후보. 먼저 0.8로 저장하고 목표 크기를 넘으면 더 높은 압축으로 다시 저장 */
export const UPLOAD_QUALITIES = [0.8, 0.6, 0.45] as const;

/** base64 문자열이 나타내는 바이트 수(패딩 반영) */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** 긴 변이 상한을 넘으면 그 변만 줄일 크기, 넘지 않으면 null(비율은 manipulator가 유지) */
export function fitLongEdge(
  width: number,
  height: number,
  max = MAX_GALLERY_EDGE,
): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}
