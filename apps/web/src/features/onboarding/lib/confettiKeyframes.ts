import {
  CONFETTI_EASING as EASING,
  CONFETTI_FADE_IN_RATIO,
  type ConfettiPiece,
} from '../constants/confetti';
import { toKeyframes, type KeyframeStep } from './toKeyframes';

/** 팔랑임 시작부터 끝까지를 같은 간격으로 나눈 시각 */
const evenly = (from: number, to: number, count: number) =>
  Array.from({ length: count }, (_, index) => from + ((to - from) * index) / (count - 1));

/**
 * 조각 하나의 Figma 키프레임. 가로·세로 이동은 시각과 곡선이 달라 서로 다른 요소에 적용
 * 왼쪽 위 기준이 아니라 가운데 기준으로 회전·눌림(요소 기본 origin)
 */
export function confettiKeyframes(piece: ConfettiPiece) {
  const { start, flutterStart, end, fadeOut } = piece;

  const [x1, x2, x3, x4] = piece.x;
  const xTimes = evenly(flutterStart, end, 4);
  const translateX = toKeyframes(
    [
      [0, '0px 0px', EASING.linear],
      [start, '0px 0px', EASING.rise],
      [xTimes[0] ?? flutterStart, `${x1}px 0px`, EASING.easeInOut],
      [xTimes[1] ?? flutterStart, `${x2}px 0px`, EASING.easeInOut],
      [xTimes[2] ?? flutterStart, `${x3}px 0px`, EASING.easeInOut],
      [end, `${x4}px 0px`, EASING.linear],
      [1, `${x4}px 0px`],
    ],
    'translate',
  );

  const [rise, fall] = piece.y;
  const translateY = toKeyframes(
    [
      [0, '0px 0px', EASING.linear],
      [start, '0px 0px', EASING.rise],
      [flutterStart, `0px ${rise}px`, EASING.fall],
      [end, `0px ${fall}px`, EASING.linear],
      [1, `0px ${fall}px`],
    ],
    'translate',
  );

  const [from, to] = piece.rotation;
  const rotate = toKeyframes(
    [
      [0, `${from}rad`, EASING.linear],
      [start, `${from}rad`, EASING.rotate],
      [end, `${to}rad`, EASING.linear],
      [1, `${to}rad`],
    ],
    'rotate',
  );

  // 눌림 → 복귀를 팔랑임 횟수만큼 같은 간격으로 반복(마지막 복귀가 끝 시각)
  const lastFlutter = piece.flutter.length - 1;
  const flutterTimes = evenly(flutterStart, end, piece.flutter.length * 2 + 1);
  const scale = toKeyframes(
    [
      [0, '1 1', EASING.linear],
      [flutterStart, '1 1', EASING.easeInOut],
      ...piece.flutter.flatMap((value, index): KeyframeStep[] => [
        [flutterTimes[index * 2 + 1] ?? end, `${value} 1`, EASING.easeInOut],
        [
          flutterTimes[index * 2 + 2] ?? end,
          '1 1',
          index === lastFlutter ? EASING.linear : EASING.easeInOut,
        ],
      ]),
      [1, '1 1'],
    ],
    'scale',
  );

  const opacity = toKeyframes(
    [
      [0, 0, EASING.linear],
      [start, 0, EASING.easeOut],
      [start + CONFETTI_FADE_IN_RATIO, 1, EASING.linear],
      [fadeOut, 1, EASING.fade],
      [end, 0, EASING.linear],
      [1, 0],
    ],
    'opacity',
  );

  return { translateX, translateY, rotate, scale, opacity };
}
