import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OtherBunchMembersPage, { metadata } from './page';

vi.mock('@/features/bunch-home/components', () => ({
  OtherBunchMembers: ({ bunchId }: { bunchId: string }) => (
    <div data-testid="other-bunch-members">{bunchId}</div>
  ),
}));

describe('/bunches/[bunchId]/members page', () => {
  it('전환 경계를 다른 번치 멤버 목록 id로 지정하고 route의 번치 id를 넘긴다', async () => {
    const page = await OtherBunchMembersPage({
      params: Promise.resolve({ bunchId: '4' }),
    });
    render(page);

    expect(page.props).toMatchObject({ 'data-ssgoi-transition': '/bunches/profile/members' });
    expect(screen.getByTestId('other-bunch-members')).toHaveTextContent('4');
  });

  it('검색에서 제외한다', () => {
    expect(metadata.robots).toEqual({ index: false });
  });
});
