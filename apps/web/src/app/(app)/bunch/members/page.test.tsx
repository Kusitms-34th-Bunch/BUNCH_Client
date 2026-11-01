import { describe, expect, it, vi } from 'vitest';
import BunchMembersPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({ BunchMembers: () => null }));

describe('/bunch/members page', () => {
  it('전환 경계(data-ssgoi-transition)를 멤버 관리 경로로 지정한다', () => {
    expect(BunchMembersPage().props).toMatchObject({ 'data-ssgoi-transition': '/bunch/members' });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
