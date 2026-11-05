/** 웹에서 사진으로 읽을 수 있는 형식 */
export const WEB_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
/** 웹 파일 선택 input의 `accept`(읽을 수 있는 형식과 같은 목록) */
export const WEB_IMAGE_ACCEPT = WEB_IMAGE_TYPES.join(',');

/** 웹 파일 선택에서 받을 사진 규칙: 형식·최대 크기와 어긋났을 때 문구 */
export type ImageFileRules = {
  types: readonly string[];
  maxBytes: number;
  invalidMessage: string;
  /** 형식은 맞지만 읽지 못한 사진(손상·브라우저 미지원)의 문구. 없으면 「이 사진은 사용할 수 없어요.」 */
  unreadableMessage?: string;
};

/** 번치 사진 등 기본 규칙 */
export const DEFAULT_IMAGE_RULES: ImageFileRules = {
  types: WEB_IMAGE_TYPES,
  maxBytes: 3 * 1024 * 1024,
  invalidMessage: '3MB 이하의 JPEG, PNG, WebP 사진을 선택해 주세요.',
};

/**
 * 프로필 사진 규칙(MY 개인 프로필 편집(8), 가입 프로필도 같은 기준)
 * HEIC는 브라우저가 읽지 못하면 같은 문구로 거절(앱은 쉘이 JPEG로 바꿔 전달)
 */
export const PROFILE_IMAGE_RULES: ImageFileRules = {
  types: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
  maxBytes: 10 * 1024 * 1024,
  invalidMessage: 'JPEG・PNG・HEIC・WebP, 10MB 이하만 가능해요.',
  unreadableMessage: 'JPEG・PNG・HEIC・WebP, 10MB 이하만 가능해요.',
};
