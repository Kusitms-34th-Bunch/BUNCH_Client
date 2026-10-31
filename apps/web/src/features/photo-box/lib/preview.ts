/** 목록 API 연결 전에 화면 상태를 눈으로 확인하기 위한 임시 미리보기 값(`/photos?preview=loading` 등) */
export const PHOTO_BOX_PREVIEWS = ['loading', 'error', 'no-bunch', 'empty'] as const;

export type PhotoBoxPreview = (typeof PHOTO_BOX_PREVIEWS)[number];

/**
 * route 경계에서 쿼리 값을 검증. 알 수 없는 값이나 운영 환경(`enabled`가 false)에서는 미리보기 없음(undefined)
 * 운영에서는 미리보기 화면이 열리지 않도록 기본값은 `NODE_ENV !== 'production'`
 */
export const parsePreview = (
  value: string | string[] | undefined,
  enabled: boolean = process.env.NODE_ENV !== 'production',
): PhotoBoxPreview | undefined =>
  enabled ? PHOTO_BOX_PREVIEWS.find((preview) => preview === value) : undefined;
