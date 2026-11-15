/** 번들 제목 표시·길이 규칙(CRDT 문서 없이 문자열만 다룸) */

/** 표시용 제목: NFC로 바꾸고 앞뒤 공백을 지움(문서 원문과 커서 위치는 바꾸지 않음) */
export const displayTitle = (raw: string): string => raw.normalize('NFC').trim();

/** 40자 제한은 NFC 기준 grapheme(사용자가 보는 글자) 수로 셈 */
export const countTitleGraphemes = (raw: string): number =>
  [...new Intl.Segmenter().segment(displayTitle(raw))].length;
