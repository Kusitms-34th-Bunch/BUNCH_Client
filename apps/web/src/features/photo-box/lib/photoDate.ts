import { ALL_MEMBERS, type PhotoBoxPhoto } from './types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})/;

export type PhotoSection = {
  /** 'YYYY-MM-DD' */
  dateKey: string;
  /** 화면에 보이는 날짜 글자 */
  label: string;
  photos: PhotoBoxPhoto[];
};

export type SplitPhotos = {
  sections: PhotoSection[];
  /** 촬영 날짜를 확인하지 못한 사진(업로드 최신순) */
  undated: PhotoBoxPhoto[];
};

/** 날짜 부분만 뽑은 키. 형식이 맞지 않으면 null(날짜 미확인으로 취급) */
export const getDateKey = (takenAt: string | null): string | null => {
  const match = takenAt === null ? null : DATE_KEY.exec(takenAt);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

/** 올해는 「9월 28일 일요일」, 올해가 아니면 요일 없이 「2025년 9월 28일」 */
export const formatSectionDate = (dateKey: string, currentYear: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number) as [number, number, number];
  if (year !== currentYear) return `${year}년 ${month}월 ${day}일`;
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
};

/** 멤버 필터에 맞는 사진(함께 올린 사진은 올린 멤버 모두의 필터에 보임) */
export const filterByMember = (
  photos: readonly PhotoBoxPhoto[],
  memberId: string,
): PhotoBoxPhoto[] =>
  memberId === ALL_MEMBERS ? [...photos] : photos.filter((p) => p.uploaderIds.includes(memberId));

const byTakenAtDesc = (a: PhotoBoxPhoto, b: PhotoBoxPhoto) => {
  // 최근 촬영이 앞, 같은 시각이면 업로드 순
  if (a.takenAt !== b.takenAt) return (a.takenAt ?? '') < (b.takenAt ?? '') ? 1 : -1;
  return a.uploadedAt < b.uploadedAt ? -1 : a.uploadedAt > b.uploadedAt ? 1 : 0;
};

/** 촬영 날짜별 섹션(최신 날짜가 위)과 날짜 미확인 사진으로 나눔 */
export const splitPhotos = (photos: readonly PhotoBoxPhoto[], currentYear: number): SplitPhotos => {
  const byDate = new Map<string, PhotoBoxPhoto[]>();
  const undated: PhotoBoxPhoto[] = [];

  for (const photo of photos) {
    const key = getDateKey(photo.takenAt);
    if (key === null) {
      undated.push(photo);
      continue;
    }
    byDate.set(key, [...(byDate.get(key) ?? []), photo]);
  }

  const sections = [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dateKey, list]) => ({
      dateKey,
      label: formatSectionDate(dateKey, currentYear),
      photos: [...list].sort(byTakenAtDesc),
    }));

  undated.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : a.uploadedAt > b.uploadedAt ? -1 : 0));

  return { sections, undated };
};
