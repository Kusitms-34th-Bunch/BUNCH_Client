/** 'YYYY-MM-DD'를 기기 시간대의 그날 0시로 바꿈. 형식이 틀리면 undefined */
export const parseDraftDate = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const toDraftDateString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** 올해는 「6월 20일」, 올해가 아니면 「2025년 12월 24일」 */
export const formatDraftDate = (value: string, currentYear: number): string => {
  const date = parseDraftDate(value);
  if (!date) return value;
  const label = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  return date.getFullYear() === currentYear ? label : `${date.getFullYear()}년 ${label}`;
};
