import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BundleMembersSheet, type BundleMemberLinkState } from './BundleMembersSheet';

afterEach(cleanup);

const renderLink = ({ className, children }: BundleMemberLinkState) => (
  <a href="/members/1" className={className}>
    {children}
  </a>
);
const members = [
  { name: '은우', memberRole: 'owner' as const, roleLabel: '메인 관리자', renderLink },
  { name: '작성자' },
];

describe('BundleMembersSheet', () => {
  it('renderLink가 있는 멤버만 링크이고 역할은 배지로 읽힌다', async () => {
    render(<BundleMembersSheet open onOpenChange={() => {}} members={members} />);

    expect(await screen.findByRole('dialog', { name: '참여 멤버' })).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(items[0]?.querySelector('a')?.getAttribute('href')).toBe('/members/1');
    expect(items[1]?.querySelector('a')).toBeNull();
    expect(screen.getByRole('img', { name: '메인 관리자' })).toBeTruthy();
  });
});
