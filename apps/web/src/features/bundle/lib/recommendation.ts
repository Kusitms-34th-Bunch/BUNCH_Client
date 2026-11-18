import type { PhotoSelection } from '@/features/photo-box/lib/selection';
import type { PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import {
  formatSectionDate,
  getDateKey,
  type PhotoSection,
} from '@/features/photo-box/lib/photoDate';
import { isWireId } from '@/shared/api/ids';
import type { Recommendation, RecommendationDetail } from '../model/recommendation';
import { MAX_SELECT_PHOTOS } from '../constants/selectMessages';

export type { Recommendation, RecommendationDetail } from '../model/recommendation';

/** route 경계에서 받는 추천 id(외부 입력)는 서버 숫자 id로 바꿀 수 있는 것만 통과. 잘못된 형식이면 undefined(삭제된 추천과 같은 안내로 처리) */
export const parseRecommendationId = (value: string): string | undefined =>
  isWireId(value) ? value : undefined;

/** 적용하면 선택될 사진: 추천 순서대로 최대 장수까지(지워진 사진은 서버가 이미 뺀 최신 상태) */
export const applyRecommendation = (
  detail: RecommendationDetail,
  max: number = MAX_SELECT_PHOTOS,
): PhotoSelection => detail.photos.slice(0, max).map((photo) => photo.id);

/** 적용 뒤 스크롤할 날짜 섹션 키(첫 사진의 촬영일, 없으면 null) */
export const getApplyDateKey = (detail: RecommendationDetail): string | null => {
  const first = detail.photos[0];
  return first ? getDateKey(first.takenAt) : null;
};

const toDateParts = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return { year, month, day };
};

/**
 * 카드 날짜(기능 명세 4.2.2): 자정을 넘긴 묶음은 끝 날짜까지(`10월 19일~20일`), 올해가 아니면 시작 날짜 앞에 연도
 * 끝 날짜가 시작과 같으면 하루짜리로 봄
 */
export const getCardDate = (recommendation: Recommendation, currentYear: number) => {
  const start = toDateParts(recommendation.startDate);
  const end = recommendation.endDate ? toDateParts(recommendation.endDate) : undefined;
  const range = end && recommendation.endDate !== recommendation.startDate ? end : undefined;
  return {
    month: start.month,
    day: start.day,
    ...(start.year === currentYear ? {} : { year: start.year }),
    ...(range ? { endMonth: range.month, endDay: range.day } : {}),
  };
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
