// 구분자가 있는 형식(2026.11.25, 2026-11-25, 2026/1/5, 2026 11 25)과 붙여 쓴 8자리(20261125). 일 뒤에 숫자가 더 붙으면 거절
const SEPARATED = /^\s*(\d{4})(?:\s*[./-]\s*|\s+)(\d{1,2})(?:\s*[./-]\s*|\s+)(\d{1,2})(?!\d)/;
const COMPACT = /^\s*(\d{4})(\d{2})(\d{2})(?!\d)/;

/**
 * 입력 글자를 날짜로 해석: 앞부분의 연·월·일만 읽어 표시 글자 `2026.11.25(수) 00:00`도 허용
 * 형식이 아니거나 없는 날짜(2월 30일 등)면 null
 */
export const parseDateInput = (text: string): Date | null => {
  const match = SEPARATED.exec(text) ?? COMPACT.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate ? date : null;
};
