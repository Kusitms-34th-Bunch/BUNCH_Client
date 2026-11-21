import type { FeedBundle } from './types';

/** 상세를 받는 동안 먼저 그릴 데이터. `partial`이면 번치·제목·표지만 있고 멤버·장소·날짜는 없음(번치 홈 격자 칸) */
export type BundlePreview = { bundle: FeedBundle; partial: boolean };

// 연 번들의 카드·칸 데이터. 상세를 받는 동안 같은 자리(번치·제목·첫 사진)를 먼저 그림(피드는 hero가 바로 이어짐)
// ponytail: 연 번들만 쌓이고 지우지 않음(한 번 실행에 수십 개 수준), 많아지면 최근 몇 개만 유지
const previews = new Map<string, BundlePreview>();

/** 피드 카드로 연 번들(카드에 상세 윗부분 데이터가 모두 있음) */
export const rememberBundlePreview = (bundle: FeedBundle) =>
  previews.set(bundle.id, { bundle, partial: false });

/** 번치 홈·다른 번치 격자 칸으로 연 번들: 칸의 표지·제목과 번치 정보만 있음(route가 번치 홈에 넘김) */
export const rememberGridBundlePreview = (
  bunchId: string,
  grid: {
    id: string;
    title: string;
    coverSrc: string;
    bunchName: string;
    bunchImageSrc?: string | undefined;
  },
) => {
  // 피드 카드로 받아 둔 전체 데이터가 있으면 부분 데이터로 덮지 않음
  if (previews.get(grid.id)?.partial === false) return;
  previews.set(grid.id, {
    partial: true,
    bundle: {
      id: grid.id,
      bunch: { id: bunchId, name: grid.bunchName, imageSrc: grid.bunchImageSrc },
      publishedAt: '',
      title: grid.title,
      places: [],
      photos: [{ src: grid.coverSrc, alt: grid.title }],
      members: [],
      liked: false,
      likeCount: 0,
      commentCount: 0,
    },
  });
};

/** 상세를 받는 동안 그릴 데이터. 다른 번치의 같은 id는 쓰지 않음 */
export const getBundlePreview = (bunchId: string, bundleId: string) => {
  const preview = previews.get(bundleId);
  return preview?.bundle.bunch.id === bunchId ? preview : undefined;
};
