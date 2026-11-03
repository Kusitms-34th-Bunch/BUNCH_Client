/** 웹에서 사진으로 읽을 수 있는 형식 */
export const WEB_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
/** 웹 파일 선택 input의 `accept`(읽을 수 있는 형식과 같은 목록) */
export const WEB_IMAGE_ACCEPT = WEB_IMAGE_TYPES.join(',');
