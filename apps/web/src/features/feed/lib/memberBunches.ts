const rank = (name: string) => {
  const first = name.trim().charAt(0);
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(first)) return 0;
  if (/[a-zA-Z]/.test(first)) return 1;
  if (/[0-9]/.test(first)) return 2;
  return 3;
};

/** 참여 번치 정렬(기능명세서 6.3.3): 한글 → 영문(대소문자 무시) → 숫자 */
export const sortMemberBunches = <T extends { name: string }>(bunches: readonly T[]) =>
  [...bunches].sort(
    (a, b) =>
      rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'ko', { sensitivity: 'base' }),
  );
