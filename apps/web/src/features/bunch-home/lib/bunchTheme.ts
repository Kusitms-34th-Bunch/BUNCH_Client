import type { CharacterType } from '@/shared/lib/bunchProfile';

/** 번치 성격별 위쪽 배경(Figma 번치 메인 1873:29989). TYPE_1 연보라는 brand-subtle-1과 같은 값 */
export const BUNCH_BACKGROUNDS = {
  TYPE_1: {
    app: 'brand-subtle-1',
    frame: 'from-surface-brand-subtle-1',
    top: 'bg-surface-brand-subtle-1',
  },
  TYPE_2: { app: 'orange-50', frame: 'from-primitive-orange-50', top: 'bg-primitive-orange-50' },
  TYPE_3: { app: 'pink-50', frame: 'from-primitive-pink-50', top: 'bg-primitive-pink-50' },
  TYPE_4: { app: 'green-50', frame: 'from-primitive-green-50', top: 'bg-primitive-green-50' },
} as const satisfies Record<CharacterType, { app: string; frame: string; top: string }>;
