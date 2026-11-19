// 이미지 주소별 가로/세로 비율. 사진 상세가 원본 비율의 틀로 바로 그리도록 미리 받아 둔 값
const ratios = new Map<string, number>();
// 디코딩 중인 주소(다시 눌러도 새로 받지 않게)
const pending = new Set<string>();

export const getPhotoRatio = (src: string) => ratios.get(src);

export const rememberPhotoRatio = (src: string, width: number, height: number) => {
  if (width > 0 && height > 0) ratios.set(src, width / height);
};

/** 원본을 미리 받아 디코딩하고 비율을 기억(브라우저 캐시에도 남아 상세에서 바로 그려짐). 실패는 무시 */
export const preloadPhotoRatio = (src: string) => {
  if (ratios.has(src) || pending.has(src) || typeof Image === 'undefined') return;
  pending.add(src);
  const image = new Image();
  image.src = src;
  image
    .decode()
    .then(
      () => rememberPhotoRatio(src, image.naturalWidth, image.naturalHeight),
      () => {},
    )
    .finally(() => pending.delete(src));
};
