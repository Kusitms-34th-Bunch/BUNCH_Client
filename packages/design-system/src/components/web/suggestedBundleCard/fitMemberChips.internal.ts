type FitInput = {
  /** 멤버마다 요약하지 않은 칩의 너비(앞에서부터) */
  plainWidths: readonly number[];
  /** `summaryWidths[k - 1]`: 앞의 k개를 보이고 k번째 칩이 「이름 외 N명」일 때 그 칩의 너비 */
  summaryWidths: readonly number[];
  total: number;
  /** 칩 사이 간격 */
  gap: number;
  /** 칩 줄에서 쓸 수 있는 너비 */
  available: number;
  /** 보여 줄 칩 수의 상한 */
  cap: number;
};

/**
 * 한 줄에 들어가는 칩 수(1 이상): 모두 보이면 마지막 칩도 이름만 보이고, 다 못 보이면 마지막 칩이 「이름 외 N명」으로 바뀜
 * 「외 N명」 칩도 줄에 들어가야 해서 칩 수를 줄일 때마다 요약 칩의 너비로 다시 잼
 */
export const fitChipCount = ({
  plainWidths,
  summaryWidths,
  total,
  gap,
  available,
  cap,
}: FitInput): number => {
  const limit = Math.max(1, Math.min(cap, total));
  for (let count = limit; count > 1; count -= 1) {
    const summarized = count < total;
    const last = summarized ? summaryWidths[count - 1] : plainWidths[count - 1];
    if (last === undefined) continue;
    const leading = plainWidths.slice(0, count - 1).reduce((sum, width) => sum + width, 0);
    if (leading + last + gap * (count - 1) <= available) return count;
  }
  // 하나만 보여도 넘치면 그 칩이 줄 안에서 잘림(칩 줄이 넘침을 숨김)
  return 1;
};
