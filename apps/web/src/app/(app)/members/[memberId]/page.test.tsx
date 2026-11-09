import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MemberProfilePage from './page';

vi.mock('./MemberProfileRoute', () => ({
  MemberProfileRoute: ({ memberId }: { memberId: string }) => <p>{memberId}</p>,
}));

describe('/members/[memberId] page', () => {
  it('주소의 멤버 ID를 화면에 넘기고 전환 경계를 둔다', async () => {
    const { container } = render(
      await MemberProfilePage({ params: Promise.resolve({ memberId: 'm1' }) }),
    );

    expect(screen.getByText('m1')).toBeInTheDocument();
    expect(container.firstElementChild?.getAttribute('data-ssgoi-transition')).toBe(
      '/members/profile',
    );
  });
});
