// 숨기기가 성공한 광고(앱이 켜져 있는 동안). 서버가 피드에서 빼지만, 다시 들어올 때 받아 둔 목록을 먼저 그리거나 다시 받기가 실패해도 보이지 않게
const hiddenAds = new Set<string>();

export const markAdHidden = (adId: string) => void hiddenAds.add(adId);

/** 피드에 다시 들어올 때 뺄 광고. 숨긴 그 자리에서는 숨김 안내를 보이므로 화면을 열 때 한 번만 읽음 */
export const readHiddenAds = () => new Set(hiddenAds);

/** 테스트 사이에 상태를 비움 */
export const clearHiddenAds = () => hiddenAds.clear();
