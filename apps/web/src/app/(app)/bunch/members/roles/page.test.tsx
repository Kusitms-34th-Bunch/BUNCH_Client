import { describe, expect, it, vi } from 'vitest';
import BunchRoleGuidePage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({ BunchRoleGuide: () => null }));

describe('/bunch/members/roles page', () => {
  it('전환 경계(data-ssgoi-transition)를 역할별 권한 경로로 지정한다', () => {
    expect(BunchRoleGuidePage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/members/roles',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
