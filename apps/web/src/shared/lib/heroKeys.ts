/**
 * 번들 대표 사진과 번들 상세 첫 사진을 잇는 화면 전환 공유 요소 키(SSGOI hero·zoom, BundlePhoto `heroKey`)
 * 피드 카드와 번치 홈 격자가 함께 써서 shared에 둠
 */
export const bundleHeroKey = (bundleId: string) => `bundle-photo-${bundleId}`;
