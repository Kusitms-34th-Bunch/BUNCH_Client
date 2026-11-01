import { describe, expect, it, vi } from 'vitest';
import BundleDraftMembersPage, { metadata } from './page';

vi.mock('@/features/bundle/components', () => ({ BundleDraftMembers: () => null }));

describe('/bunch/drafts/[draftId]/members page', () => {
  it('참여 멤버 관리 화면을 그린다', () => {
    expect(BundleDraftMembersPage().type).toBeTypeOf('function');
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
