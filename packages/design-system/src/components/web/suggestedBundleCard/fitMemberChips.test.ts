import { describe, expect, it } from 'vitest';
import { fitChipCount } from './fitMemberChips';

// 칩 4개: 이름만 있는 칩은 50px, 「이름 외 N명」 칩은 100px
const base = {
  plainWidths: [50, 50, 50, 50],
  summaryWidths: [100, 100, 100],
  total: 4,
  gap: 10,
  cap: 6,
};

describe('fitChipCount', () => {
  it('모두 들어가면 전부 보인다', () => {
    expect(fitChipCount({ ...base, available: 230 })).toBe(4);
  });

  it('다 못 들어가면 「외 N명」 칩이 들어갈 자리까지 계산해 칩 수를 줄인다', () => {
    // 3개: 50 + 50 + 요약 100 + 간격 20 = 220 > 200, 2개: 50 + 요약 100 + 간격 10 = 160
    expect(fitChipCount({ ...base, available: 200 })).toBe(2);
  });

  it('상한을 넘겨 보이지 않는다', () => {
    expect(fitChipCount({ ...base, available: 1000, cap: 2 })).toBe(2);
  });

  it('하나도 못 들어가도 1개는 보인다', () => {
    expect(fitChipCount({ ...base, available: 10 })).toBe(1);
  });

  it('멤버가 1명이면 1이다', () => {
    expect(
      fitChipCount({ ...base, plainWidths: [50], summaryWidths: [], total: 1, available: 5 }),
    ).toBe(1);
  });
});
