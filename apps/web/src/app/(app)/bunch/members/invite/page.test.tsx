import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import BunchMemberInvitePage, { metadata } from './page';

vi.mock('@/features/bunch-invite/components', () => ({ BunchInvite: () => null }));

describe('/bunch/members/invite page', () => {
  it('전환 경계를 멤버 초대 경로로 두고 닫으면 이전 화면(없으면 멤버 관리)으로 간다', () => {
    const page = BunchMemberInvitePage();
    expect(page.props).toMatchObject({ 'data-ssgoi-transition': '/bunch/members/invite' });
    const { children } = page.props as { children: ReactElement<Record<string, unknown>> };
    expect(children.props).toMatchObject({
      leaveHref: '/bunch/members',
      backOnLeave: true,
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
