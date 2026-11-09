// ponytail: 메모리 보관이라 새로고침하면 다시 보임. 숨김 API(구현 단위 10)를 연결하면 서버가 뺀 목록으로 대체
const hiddenAds = new Set<string>();

export const markAdHidden = (adId: string) => void hiddenAds.add(adId);

/** 피드에 다시 들어올 때 뺄 광고. 숨긴 그 자리에서는 숨김 안내를 보이므로 화면을 열 때 한 번만 읽음 */
export const readHiddenAds = () => new Set(hiddenAds);

/** 테스트 사이에 상태를 비움 */
export const clearHiddenAds = () => hiddenAds.clear();
