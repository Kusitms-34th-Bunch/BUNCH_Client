import type { PhotoBoxMember, PhotoBoxPhoto } from './types';
import { formatSectionDate, getDateKey, splitPhotos } from './photoDate';

// route 경계에서 받는 photoId는 외부 입력이라 허용 문자와 길이를 제한
const PHOTO_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** 잘못된 형식이면 undefined(삭제된 사진과 같은 안내로 처리) */
export const parsePhotoId = (value: string): string | undefined =>
  PHOTO_ID.test(value) ? value : undefined;

/**
 * 상세에서 좌우로 넘기는 순서: 사진함 날짜 섹션 순서(최신 날짜 먼저, 섹션 안은 최근 촬영 먼저)이고,
 * 촬영 날짜를 확인하지 못한 사진은 맨 뒤(접힌 아코디언 안 사진이라 날짜 있는 사진 사이에 끼우지 않음)
 */
export const getDetailOrder = (
  photos: readonly PhotoBoxPhoto[],
  currentYear: number,
): PhotoBoxPhoto[] => {
  const { sections, undated } = splitPhotos(photos, currentYear);
  return [...sections.flatMap((section) => section.photos), ...undated];
};

/** 헤더 날짜: 사진함과 같은 형식, 촬영 날짜를 확인하지 못했으면 「날짜 미확인」 */
export const formatDetailDate = (takenAt: string | null, currentYear: number): string => {
  const dateKey = getDateKey(takenAt);
  return dateKey ? formatSectionDate(dateKey, currentYear) : '날짜 미확인';
};

/** 사진을 올린 멤버(함께 올린 사진은 여러 명, 올린 순서 유지). 멤버 목록에 없는 id는 건너뜀 */
export const getUploaders = (
  photo: PhotoBoxPhoto,
  members: readonly PhotoBoxMember[],
): PhotoBoxMember[] =>
  photo.uploaderIds.flatMap((id) => {
    const member = members.find((candidate) => candidate.id === id);
    return member ? [member] : [];
  });
