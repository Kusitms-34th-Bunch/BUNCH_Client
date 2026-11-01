import { describe, expect, it, vi } from 'vitest';
import BunchBlockedListPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({ BunchBlockedList: () => null }));

describe('/bunch/menu/blocked page', () => {
  it('전환 경계(data-ssgoi-transition)를 차단 목록 경로로 지정한다', () => {
    expect(BunchBlockedListPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/menu/blocked',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
