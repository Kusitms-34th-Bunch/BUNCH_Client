import type { CharacterType } from '@/shared/lib/bunchProfile';

// Figma `6174:15909`(Bunch/Join/Motion · D · Seal & Flip) 모션 데이터. 모든 시각은 전체 길이 대비 0~1
/** Figma 타임라인 4.2초. 2.5초에 제목이 나타나면 이후는 정지 */
export const INVITE_REVEAL_DURATION_MS = 4200;
/** 카드가 펼쳐진 시각(전체 길이 대비). 이때부터 「참여하기」를 누를 수 있음 */
export const INVITE_REVEAL_CARD_READY = 0.4714;

export const INVITE_REVEAL_EASING = {
  linear: 'linear',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  rise: 'cubic-bezier(0.33, 0, 0.15, 1)',
  accelerate: 'cubic-bezier(0.5, 0, 0.75, 0)',
  decelerate: 'cubic-bezier(0.25, 1, 0.5, 1)',
  fade: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/** 봉투 뒷면·인장 색. Figma는 첫 번째(TYPE_1)만 있어 나머지는 같은 단계의 색 계열로 둔 값(확인 필요) */
export const INVITE_REVEAL_COLORS: Readonly<Record<CharacterType, string>> = {
  TYPE_1: '#454edf',
  TYPE_2: '#ffa100',
  TYPE_3: '#ff6ccd',
  TYPE_4: '#26e26a',
};

/** 인장 가운데 70×70 칸 안의 10px 조각과 흩어질 거리(px). 가운데 조각은 제자리에서 사라짐 */
export const INVITE_REVEAL_GLINTS = [
  { id: '6174:15959', left: 30, top: 0, dx: 0, dy: -42 },
  { id: '6174:15960', left: 30, top: 10, dx: 0, dy: -28 },
  { id: '6174:15961', left: 20, top: 20, dx: -14, dy: -14 },
  { id: '6174:15962', left: 40, top: 20, dx: 14, dy: -14 },
  { id: '6174:15963', left: 0, top: 30, dx: -42, dy: 0 },
  { id: '6174:15964', left: 10, top: 30, dx: -28, dy: 0 },
  { id: '6174:15965', left: 30, top: 30, dx: 0, dy: 0 },
  { id: '6174:15966', left: 50, top: 30, dx: 28, dy: 0 },
  { id: '6174:15967', left: 60, top: 30, dx: 42, dy: 0 },
  { id: '6174:15968', left: 20, top: 40, dx: -14, dy: 14 },
  { id: '6174:15969', left: 40, top: 40, dx: 14, dy: 14 },
  { id: '6174:15970', left: 30, top: 50, dx: 0, dy: 28 },
  { id: '6174:15971', left: 30, top: 60, dx: 0, dy: 42 },
] as const;
