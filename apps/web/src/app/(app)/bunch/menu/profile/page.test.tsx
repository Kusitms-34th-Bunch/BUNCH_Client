import { describe, expect, it, vi } from 'vitest';
import BunchProfileEditPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({ BunchProfileEdit: () => null }));

describe('/bunch/menu/profile page', () => {
  it('전환 경계(data-ssgoi-transition)를 프로필 편집 경로로 지정한다', () => {
    expect(BunchProfileEditPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/menu/profile',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
