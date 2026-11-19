import { createListeners } from './listeners';

// 화면 전체 로딩(PageLoading)이 떠 있는 개수. 화면 전환 뒤 토스트와 앱 스플래시 닫기(AuthGate appReady)가 도착 화면의 로딩이 끝나길 기다리는 데 씀
let count = 0;
const { subscribe, emit } = createListeners();

export const subscribePageLoading = subscribe;

export const getPageLoadingCount = () => count;

/** 로딩이 뜬 동안 표시를 유지하고, 돌려주는 함수를 부르면 해제 */
export const markPageLoading = () => {
  count += 1;
  emit();
  return () => {
    count -= 1;
    emit();
  };
};
