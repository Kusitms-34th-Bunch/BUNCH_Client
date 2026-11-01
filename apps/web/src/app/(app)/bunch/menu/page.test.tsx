import { describe, expect, it, vi } from 'vitest';
import BunchMenuPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({ BunchMenu: () => null }));

describe('/bunch/menu page', () => {
  it('전환 경계(data-ssgoi-transition)를 더보기 메뉴 경로로 지정한다', () => {
    expect(BunchMenuPage().props).toMatchObject({ 'data-ssgoi-transition': '/bunch/menu' });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
