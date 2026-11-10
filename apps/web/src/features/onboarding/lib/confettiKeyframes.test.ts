import { describe, expect, it } from 'vitest';
import { CONFETTI_FADE_IN_RATIO, CONFETTI_PIECES } from '../constants/confetti';
import { confettiKeyframes } from './confettiKeyframes';

const first = CONFETTI_PIECES[0]!;
const offsets = (keyframes: Keyframe[]) => keyframes.map((keyframe) => keyframe.offset);

describe('confettiKeyframes', () => {
  it('조각은 Figma와 같은 16개다', () => {
    expect(CONFETTI_PIECES).toHaveLength(16);
  });

  it('모든 키프레임의 시각은 0에서 1까지 커지는 순서다', () => {
    for (const piece of CONFETTI_PIECES) {
      for (const keyframes of Object.values(confettiKeyframes(piece))) {
        const times = offsets(keyframes) as number[];
        expect(times[0]).toBe(0);
        expect(times.at(-1)).toBe(1);
        expect(times).toEqual([...times].sort((a, b) => a - b));
      }
    }
  });

  it('가로 이동은 팔랑임 시작부터 끝까지 같은 간격의 네 지점이다', () => {
    const { translateX } = confettiKeyframes(first);
    const times = offsets(translateX) as number[];

    // 0, 시작, 네 지점, 1
    expect(times).toHaveLength(7);
    const [s, a, b, end] = [times[2]!, times[3]!, times[4]!, times[5]!];
    expect(s).toBeCloseTo(first.flutterStart);
    expect(a - s).toBeCloseTo(b - a);
    expect(end).toBeCloseTo(first.end);
    expect(translateX[5]?.translate).toBe(`${first.x[3]}px 0px`);
  });

  it('세로 이동은 솟아올랐다가 떨어지는 지점에서 끝난다', () => {
    const { translateY } = confettiKeyframes(first);

    expect(translateY.map((keyframe) => keyframe.translate)).toEqual([
      '0px 0px',
      '0px 0px',
      `0px ${first.y[0]}px`,
      `0px ${first.y[1]}px`,
      `0px ${first.y[1]}px`,
    ]);
  });

  it('뒤집힘은 팔랑임 횟수만큼 눌렸다가 돌아오고 끝 시각에는 원래 배율이다', () => {
    for (const piece of CONFETTI_PIECES) {
      const { scale } = confettiKeyframes(piece);
      const values = scale.map((keyframe) => keyframe.scale);

      // 처음 두 개와 마지막 하나는 1, 사이에는 (눌림, 1)이 팔랑임 횟수만큼
      expect(values).toHaveLength(piece.flutter.length * 2 + 3);
      expect(values.filter((value) => value !== '1 1')).toEqual(
        piece.flutter.map((value) => `${value} 1`),
      );
      expect(scale.at(-2)?.offset).toBeCloseTo(piece.end);
    }
  });

  it('불투명도는 나타났다 머무른 뒤 끝 시각에 사라진다', () => {
    const { opacity } = confettiKeyframes(first);

    expect(opacity.map((keyframe) => keyframe.opacity)).toEqual([0, 0, 1, 1, 0, 0]);
    expect(opacity[2]?.offset).toBeCloseTo(first.start + CONFETTI_FADE_IN_RATIO);
    expect(opacity[3]?.offset).toBe(first.fadeOut);
  });
});
