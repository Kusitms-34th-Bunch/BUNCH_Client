import { describe, expect, it, vi } from 'vitest';
import BundleDraftMembersPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraftMembers: () => null }));

describe('/bunch/drafts/[draftId]/members page', () => {
  it('전환 경계(data-ssgoi-transition)를 참여 멤버 관리 id로 지정한다', () => {
    expect(BundleDraftMembersPage().props).toMatchObject({
      'data-ssgoi-transition': '/bunch/drafts/members',
    });
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
