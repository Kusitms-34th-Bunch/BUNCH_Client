import { describe, expect, it } from 'vitest';
import { BUNCH_BACKGROUNDS } from './bunchTheme';

describe('BUNCH_BACKGROUNDS', () => {
  it.each([
    ['TYPE_1', 'brand-subtle-1', 'bg-surface-brand-subtle-1'],
    ['TYPE_2', 'orange-50', 'bg-primitive-orange-50'],
    ['TYPE_3', 'pink-50', 'bg-primitive-pink-50'],
    ['TYPE_4', 'green-50', 'bg-primitive-green-50'],
  ] as const)('%s는 %s 배경을 쓴다', (type, app, top) => {
    expect(BUNCH_BACKGROUNDS[type]).toMatchObject({ app, top });
  });
});
