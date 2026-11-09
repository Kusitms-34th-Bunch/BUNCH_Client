import { describe, expect, it, vi } from 'vitest';
import BundleMemberSelectPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleMemberSelect: () => null }));

describe('/bunch/bundles/new/members page', () => {
  it('전환 경계(data-ssgoi-transition)를 멤버 선택 경로로 지정한다', () => {
    expect(BundleMemberSelectPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/bundles/new/members',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
