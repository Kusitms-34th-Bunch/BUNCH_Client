import type { CharacterType } from '@/shared/lib/profile/bunchProfile';
import type { FeedComment } from './types';

/** 번치 성격별 배지 색(번치 메인 배경과 같은 계열) */
const BADGE_COLORS: Record<CharacterType, NonNullable<FeedComment['bunchColor']>> = {
  TYPE_1: 'brand',
  TYPE_2: 'orange',
  TYPE_3: 'pink',
  TYPE_4: 'green',
};

export const badgeColorOf = (type: CharacterType | undefined) =>
  type ? BADGE_COLORS[type] : 'gray';

/** 「YYYY.MM.DD」 */
export const formatCommentDate = (time: number) => {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
};
