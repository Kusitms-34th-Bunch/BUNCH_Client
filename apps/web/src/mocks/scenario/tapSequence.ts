/**
 * 연속 터치 판정: 앞선 터치와의 간격이 gapMs 이내로 count번 이어지면 true, 간격이 벌어지면 처음부터 다시 셈
 * 진행자 장치를 참여자가 우연히 열지 않도록 횟수와 간격을 넉넉히 두는 데 씀
 */
export const createTapSequence = ({
  count,
  gapMs,
  now = Date.now,
}: {
  count: number;
  gapMs: number;
  now?: () => number;
}) => {
  let taps = 0;
  let last = 0;
  return {
    /** 터치 한 번을 기록하고, 이번 터치로 count번이 채워졌으면 true(채워지면 처음부터 다시 셈) */
    tap: () => {
      const at = now();
      taps = taps > 0 && at - last <= gapMs ? taps + 1 : 1;
      last = at;
      if (taps < count) return false;
      taps = 0;
      return true;
    },
  };
};
