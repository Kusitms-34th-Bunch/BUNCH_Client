import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { joinInvitationFixture } from '../../fixtures/join.fixture';
import { BunchJoinInvitation } from './BunchJoinInvitation';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const Providers = ({ children }: { children: ReactNode }) => (
  <OverlayProvider>{children}</OverlayProvider>
);
const renderInvitation = () =>
  render(<BunchJoinInvitation {...joinInvitationFixture} />, { wrapper: Providers });

describe('BunchJoinInvitation', () => {
  beforeEach(() => replace.mockClear());

  it('제목과 본문(main), 초대 카드(번치 이름·소개·초대한 사람)를 보여 준다', () => {
    renderInvitation();

    expect(
      screen.getByRole('heading', { level: 1, name: '초대받은 번치에 참여할까요?' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    const card = screen.getByRole('article', { name: '여행가조' });
    expect(within(card).getByText('틈만 나면 떠나는 여행 좋아하는 네 명')).toBeTruthy();
    expect(card.textContent).toContain('From. 민지 님');
  });

  it('참여하기를 누르면 참여 완료 화면으로 replace하고 중복으로 눌러도 한 번만 이동한다', async () => {
    renderInvitation();
    const join = screen.getByRole('button', { name: '참여하기' });

    await userEvent.click(join);
    await userEvent.click(join);

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchComplete);
  });

  it('뒤로 가기는 중단 확인 모달을 열고 계속 참여하기는 모달만 닫는다', async () => {
    renderInvitation();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('번치 참여를 그만둘까요?')).toBeTruthy();

    await userEvent.click(within(dialog).getByRole('button', { name: '계속 참여하기' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(replace).not.toHaveBeenCalled();
  });

  it('모달의 나가기는 닫힘이 끝난 뒤 피드로 이동한다', async () => {
    renderInvitation();
    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    const dialog = await screen.findByRole('alertdialog');

    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed));
  });
});
