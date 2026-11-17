import { photoBoxFixture } from '@/features/photo-box/fixtures/photoBox.fixture';
import type { RecommendationDetailState, RecommendationLoad } from '../hooks/useRecommendations';
import type { Recommendation, RecommendationDetail } from '../model/recommendation';

// feature 예외 import 개수를 늘리지 않으려고 사진함 타입은 샘플에서 추론함
type PhotoBoxPhoto = (typeof photoBoxFixture.photos)[number];

// 번들 만들기 화면 테스트의 추천 번들 대역: 사진함 샘플 사진을 추천 순서대로 나눠 담음(실제 추천 API는 api·mock 테스트가 확인)
const ready: readonly PhotoBoxPhoto[] = photoBoxFixture.photos.filter(
  (photo) => photo.status === 'ready' && photo.takenAt !== null,
);

const dateOf = (photo: PhotoBoxPhoto | undefined) => photo?.takenAt?.slice(0, 10) ?? '2026-09-27';

const entry = (
  id: string,
  title: string,
  memberNames: readonly string[],
  photos: readonly PhotoBoxPhoto[],
): { card: Recommendation; detail: RecommendationDetail } => ({
  card: {
    id,
    title,
    imageSrc: photos[0]?.src ?? '',
    memberNames,
    photoCount: photos.length,
    startDate: dateOf(photos[0]),
    endDate: null,
  },
  detail: { id, title, photos, originalSrcById: {}, members: photoBoxFixture.members },
});

const entries = [
  entry('rec-1', '성수동 러닝 모임', ['지예', '경진', '수인', '은우', '경준'], ready.slice(0, 6)),
  entry(
    'rec-2',
    '성수동 러닝 모임',
    ['지예', '경진', '수인', '은우', '경준', '효찬', '다온'],
    ready.slice(3, 9),
  ),
  entry('rec-3', '한강 피크닉', ['지예', '수인', '효찬', '경준'], ready.slice(6, 12)),
];

type Control = {
  cards: readonly Recommendation[];
  details: Readonly<Record<string, RecommendationDetail>>;
  /** 목록·상세 요청이 실패하는 상황 */
  failing: boolean;
  /** 이 id의 상세는 삭제됐다고 답함(목록에는 남아 있을 수 있음) */
  deletedIds: readonly string[];
  /** 요청한 id 기록 */
  detailRequests: string[];
  listRequests: number;
  /** 있으면 목록 응답이 이 약속이 풀릴 때까지 늦어짐(받는 동안의 화면 확인용) */
  listGate: Promise<void> | undefined;
  /** 있으면 상세 응답이 이 약속이 풀릴 때까지 늦어짐(사진을 받는 동안의 시트 조작 확인용) */
  detailGate: Promise<void> | undefined;
  /** 상세·뷰어 화면이 받는 중 상태(loading)인 상황 */
  detailLoading: boolean;
};

const initial = (): Control => ({
  cards: entries.map((item) => item.card),
  details: Object.fromEntries(entries.map((item) => [item.detail.id, item.detail])),
  failing: false,
  deletedIds: [],
  detailRequests: [],
  listRequests: 0,
  listGate: undefined,
  detailGate: undefined,
  detailLoading: false,
});

/** 테스트가 시나리오를 바꾸는 손잡이. `resetRecommendationDouble`로 처음 상태로 돌림 */
export const recommendationDouble: Control = initial();

export const resetRecommendationDouble = () => Object.assign(recommendationDouble, initial());

const loadList = async (): Promise<RecommendationLoad<readonly Recommendation[]>> => {
  recommendationDouble.listRequests += 1;
  await recommendationDouble.listGate;
  return recommendationDouble.failing
    ? { kind: 'failed' }
    : { kind: 'ready', data: recommendationDouble.cards };
};

const loadDetail = async (id: string): Promise<RecommendationLoad<RecommendationDetail>> => {
  recommendationDouble.detailRequests.push(id);
  await recommendationDouble.detailGate;
  if (recommendationDouble.failing) return { kind: 'failed' };
  const detail = recommendationDouble.details[id];
  if (!detail || recommendationDouble.deletedIds.includes(id)) return { kind: 'deleted' };
  return { kind: 'ready', data: detail };
};

/** `hooks/useRecommendations`를 대신하는 모듈(vi.mock 용) */
export const recommendationHooksDouble = {
  useRecommendationLoader: () => ({ loadList, loadDetail }),
  useRecommendationDetail: (id: string | undefined): RecommendationDetailState => {
    if (id === undefined) return { kind: 'deleted' };
    if (recommendationDouble.detailLoading) return { kind: 'loading' };
    if (recommendationDouble.failing) return { kind: 'error' };
    const detail = recommendationDouble.details[id];
    if (!detail || recommendationDouble.deletedIds.includes(id)) return { kind: 'deleted' };
    return { kind: 'ready', detail };
  },
};
