import {
  INVITE_REVEAL_EASING as EASING,
  type INVITE_REVEAL_GLINTS,
} from '../constants/inviteReveal';
import { toKeyframes } from './toKeyframes';

/** 봉투 뒷면: 아래에서 올라와 나타났다가 가로로 접히며 카드 앞면에 자리를 넘김 */
export const envelopeKeyframes = {
  opacity: toKeyframes(
    [
      [0, 0, EASING.linear],
      [0.0357, 0, EASING.easeInOut],
      [0.119, 1, EASING.linear],
      [0.4047, 1, EASING.linear],
      [0.4048, 0, EASING.linear],
      [1, 0],
    ],
    'opacity',
  ),
  translate: toKeyframes(
    [
      [0, '0px 60px', EASING.linear],
      [0.0357, '0px 60px', EASING.rise],
      [0.1667, '0px 0px', EASING.linear],
      [1, '0px 0px'],
    ],
    'translate',
  ),
  scale: toKeyframes(
    [
      [0, '1 1', EASING.linear],
      [0.3452, '1 1', EASING.accelerate],
      [0.4048, '0.02 1', EASING.linear],
      [1, '0.02 1'],
    ],
    'scale',
  ),
};

/** 인장: 살짝 커졌다가 사라짐 */
export const sealKeyframes = toKeyframes(
  [
    [0, '1 1', EASING.linear],
    [0.2262, '1 1', EASING.easeOut],
    [0.2619, '1.08 1.08', EASING.accelerate],
    [0.3214, '0 0', EASING.linear],
    [1, '0 0'],
  ],
  'scale',
);

/** 인장 가운데 조각: 사방으로 흩어지며 사라짐 */
export function glintKeyframes(glint: (typeof INVITE_REVEAL_GLINTS)[number]) {
  return {
    translate: toKeyframes(
      [
        [0, '0px 0px', EASING.linear],
        [0.25, '0px 0px', EASING.decelerate],
        [0.3452, `${glint.dx}px ${glint.dy}px`, EASING.linear],
        [1, `${glint.dx}px ${glint.dy}px`],
      ],
      'translate',
    ),
    opacity: toKeyframes(
      [
        [0, 1, EASING.linear],
        [0.2738, 1, EASING.fade],
        [0.3452, 0, EASING.linear],
        [1, 0],
      ],
      'opacity',
    ),
  };
}

/** 카드 앞면: 가로로 펼쳐지며 나타남 */
export const cardKeyframes = {
  opacity: toKeyframes(
    [
      [0, 0, EASING.linear],
      [0.4047, 0, EASING.linear],
      [0.4048, 1, EASING.linear],
      [1, 1],
    ],
    'opacity',
  ),
  scale: toKeyframes(
    [
      [0, '0.02 1', EASING.linear],
      [0.4048, '0.02 1', EASING.decelerate],
      [0.4714, '1 1', EASING.linear],
      [1, '1 1'],
    ],
    'scale',
  ),
};

/** 제목: 10px 아래에서 올라오며 나타남 */
export const titleKeyframes = {
  opacity: toKeyframes(
    [
      [0, 0, EASING.linear],
      [0.4762, 0, EASING.fade],
      [0.5952, 1, EASING.linear],
      [1, 1],
    ],
    'opacity',
  ),
  translate: toKeyframes(
    [
      [0, '0px 10px', EASING.linear],
      [0.4762, '0px 10px', EASING.fade],
      [0.5952, '0px 0px', EASING.linear],
      [1, '0px 0px'],
    ],
    'translate',
  ),
};
