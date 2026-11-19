import type { FeedBundle } from './types';

// 피드에서 연 번들의 카드 데이터. 상세를 받는 동안 같은 자리(번치·제목·첫 사진)를 먼저 그려 hero가 바로 이어지게 함
// ponytail: 연 번들만 쌓이고 지우지 않음(한 번 실행에 수십 개 수준), 많아지면 최근 몇 개만 유지
const previews = new Map<string, FeedBundle>();

export const rememberBundlePreview = (bundle: FeedBundle) => previews.set(bundle.id, bundle);

/** 상세를 받는 동안 그릴 카드 데이터. 다른 번치의 같은 id는 쓰지 않음 */
export const getBundlePreview = (bunchId: string, bundleId: string) => {
  const preview = previews.get(bundleId);
  return preview?.bunch.id === bunchId ? preview : undefined;
};
