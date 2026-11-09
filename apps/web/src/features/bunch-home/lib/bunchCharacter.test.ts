import { describe, expect, it } from 'vitest';
import { bunchCharacter, toBunchStage } from './bunchCharacter';

describe('toBunchStage', () => {
  it('1~4는 그대로 둔다', () => {
    expect([1, 2, 3, 4].map(toBunchStage)).toEqual([1, 2, 3, 4]);
  });

  it('범위 밖 값은 가장 가까운 단계로 맞춘다', () => {
    expect(toBunchStage(0)).toBe(1);
    expect(toBunchStage(-3)).toBe(1);
    expect(toBunchStage(5)).toBe(4);
    expect(toBunchStage(2.9)).toBe(2);
  });

  it('숫자가 아니면 1단계로 본다', () => {
    expect(toBunchStage(Number.NaN)).toBe(1);
    expect(toBunchStage(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('bunchCharacter', () => {
  it('단계가 커질수록 크기가 정해진 표를 따른다', () => {
    expect(bunchCharacter('TYPE_1', 1)).toMatchObject({ width: 92, height: 65, bottom: 12 });
    expect(bunchCharacter('TYPE_1', 2)).toMatchObject({ width: 102, height: 74, bottom: 13 });
    expect(bunchCharacter('TYPE_1', 3)).toMatchObject({ width: 112, height: 80, bottom: 16 });
    expect(bunchCharacter('TYPE_1', 4)).toMatchObject({ width: 112, height: 106, bottom: 12 });
  });

  it('범위 밖 stage도 크기를 돌려준다', () => {
    expect(bunchCharacter('TYPE_2', 0).width).toBe(92);
    expect(bunchCharacter('TYPE_2', 9).width).toBe(112);
  });

  it('성격과 단계마다 다른 이미지를 고른다', () => {
    const images = (['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'] as const).flatMap((type) =>
      [1, 2, 3, 4].map((stage) => JSON.stringify(bunchCharacter(type, stage).image)),
    );
    expect(new Set(images).size).toBe(16);
  });
});
