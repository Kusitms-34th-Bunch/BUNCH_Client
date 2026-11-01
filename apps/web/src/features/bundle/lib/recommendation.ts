import type { PhotoSelection } from '@/features/photo-box/lib/selection';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import {
  formatSectionDate,
  getDateKey,
  type PhotoSection,
} from '@/features/photo-box/lib/photoDate';
import { MAX_SELECT_PHOTOS } from '../constants/selectMessages';

/** 서버가 만들어 주는 추천 번들(제목은 기획의 제목 생성 로직이 정해 내려줌) */
export type Recommendation = {
  id: string;
  title: string;
  /** 대표 사진(추천 사진 순서의 첫 장) */
  imageSrc: string;
  /** 참여 멤버 이름(칩) */
  memberNames: readonly string[];
  /** 추천 순서대로 담은 사진 id */
  photoIds: readonly string[];
  /** 대표 날짜(자정을 넘긴 묶음은 첫날) */
  month: number;
  day: number;
};

// route 경계에서 받는 추천 id는 외부 입력이라 허용 문자와 길이를 제한
const RECOMMENDATION_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** 잘못된 형식이면 undefined(삭제된 추천과 같은 안내로 처리) */
export const parseRecommendationId = (value: string): string | undefined =>
  RECOMMENDATION_ID.test(value) ? value : undefined;

/** 추천 순서를 지킨 사진. 사진함에서 사라졌거나 아직 쓸 수 없는 사진은 뺌 */
export const getRecommendationPhotos = (
  recommendation: Recommendation,
  photos: readonly PhotoBoxPhoto[],
): PhotoBoxPhoto[] => {
  const byId = new Map(photos.map((photo) => [photo.id, photo]));
  return recommendation.photoIds.flatMap((id) => {
    const photo = byId.get(id);
    return photo && photo.status === 'ready' ? [photo] : [];
  });
};

/** 적용하면 선택될 사진: 추천 순서대로, 사라진 사진은 빼고 최대 장수까지 */
export const applyRecommendation = (
  recommendation: Recommendation,
  photos: readonly PhotoBoxPhoto[],
  max: number = MAX_SELECT_PHOTOS,
): PhotoSelection =>
  getRecommendationPhotos(recommendation, photos)
    .slice(0, max)
    .map((photo) => photo.id);

/** 적용 뒤 스크롤할 날짜 섹션 키(첫 사진의 촬영일, 날짜를 모르면 null) */
export const getApplyDateKey = (
  recommendation: Recommendation,
  photos: readonly PhotoBoxPhoto[],
): string | null => {
  const first = getRecommendationPhotos(recommendation, photos)[0];
  return first ? getDateKey(first.takenAt) : null;
};

/** 추천 순서를 지킨 채 같은 촬영일끼리 묶음(날짜가 처음 나온 순서). 날짜를 모르는 사진은 맨 뒤 */
export const groupByDate = (
  photos: readonly PhotoBoxPhoto[],
  currentYear: number,
): PhotoSection[] => {
  const sections: PhotoSection[] = [];
  const undated: PhotoBoxPhoto[] = [];
  for (const photo of photos) {
    const key = getDateKey(photo.takenAt);
    if (key === null) {
      undated.push(photo);
      continue;
    }
    const existing = sections.find((section) => section.dateKey === key);
    if (existing) existing.photos.push(photo);
    else
      sections.push({ dateKey: key, label: formatSectionDate(key, currentYear), photos: [photo] });
  }
  if (undated.length > 0)
    sections.push({ dateKey: 'undated', label: '날짜 미확인', photos: undated });
  return sections;
};
