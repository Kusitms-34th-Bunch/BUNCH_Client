import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import {
  clearPendingInvitation,
  readPendingInvitation,
  savePendingInvitation,
} from '@/shared/lib/pendingInvitation';
import { createQueryWrapper } from '@/shared/query/testing';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useJoinInvitationFlow } from '../../contexts/joinInvitationContext';
import { JoinInvitationProvider } from '../../contexts/JoinInvitationProvider';
import { BunchJoinEntry } from './BunchJoinEntry';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
// 이동하는 동작의 토스트는 도착 화면에서 띄우도록 예약함(`toastAfterNavigation`)
const toast = vi.fn<(_message: string) => void>();
vi.mock('@/shared/lib/toastAfterNavigation', () => ({
  toastAfterNavigation: (message: string) => toast(message),
}));

const Query = createQueryWrapper();
const Providers = ({ children }: { children: ReactNode }) => (
  <Query>
    <JoinInvitationProvider>{children}</JoinInvitationProvider>
  </Query>
);
const CARD = { name: '여행가조', introduction: '소개', inviterNickname: '민지', code: 'ABCD2345' };
const verifyWith = (eligibility: string, capture?: (_body: unknown) => void) =>
  server.use(
    http.post('/api/invitations/verify', async ({ request }) => {
      capture?.(await request.json());
      return ok({ card: { ...CARD, imageUrl: null }, eligibility });
    }),
  );

describe('BunchJoinEntry', () => {
  beforeEach(() => {
    replace.mockClear();
    toast.mockClear();
    clearPendingInvitation();
  });

  it('확인하는 동안 제목(보이지 않음)과 확인 중 안내를 보인다', () => {
    savePendingInvitation('ABCD2345');
    verifyWith('AVAILABLE');
    render(<BunchJoinEntry />, { wrapper: Providers });

    expect(screen.getByRole('heading', { level: 1, name: '초대장 확인' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('초대를 확인하는 중이에요');
  });

  it.each(['AVAILABLE', 'LIMIT_EXCEEDED'])(
    '보관된 초대가 %s면 확인한 카드를 남기고 초대 확인 화면으로 replace한다(소속 10개여도 카드는 보여 줌)',
    async (eligibility) => {
      savePendingInvitation('ABCD2345');
      let sent: unknown;
      verifyWith(eligibility, (body) => (sent = body));
      const Probe = () => (
        <output aria-label="확인한 초대">
          {useJoinInvitationFlow().verified?.card.name ?? '없음'}
        </output>
      );
      render(
        <>
          <BunchJoinEntry />
          <Probe />
        </>,
        { wrapper: Providers },
      );

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation),
      );
      expect(sent).toEqual({ invitation: 'ABCD2345' });
      expect(screen.getByLabelText('확인한 초대').textContent).toBe('여행가조');
      // 초대 확인 화면에서 참여·그만둠으로 정리하므로 여기서는 보관을 유지
      expect(readPendingInvitation()).toBe('ABCD2345');
      expect(toast).not.toHaveBeenCalled();
    },
  );

  it('요청은 한 번만 보낸다', async () => {
    savePendingInvitation('ABCD2345');
    let calls = 0;
    server.use(
      http.post('/api/invitations/verify', () => {
        calls += 1;
        return ok({ card: { ...CARD, imageUrl: null }, eligibility: 'AVAILABLE' });
      }),
    );
    const { rerender } = render(<BunchJoinEntry />, { wrapper: Providers });
    rerender(<BunchJoinEntry />);

    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(calls).toBe(1);
  });

  it('이미 참여 중이면 알린 뒤 번치로 이동하고 보관한 초대를 지운다', async () => {
    savePendingInvitation('ABCD2345');
    verifyWith('ALREADY_MEMBER');
    render(<BunchJoinEntry />, { wrapper: Providers });

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed));
    expect(toast).toHaveBeenCalledWith('이미 참여 중인 번치예요.');
    expect(readPendingInvitation()).toBeNull();
  });

  it('정원이 찼으면 이유를 알리고 보관한 초대를 지운 뒤 번치 시작으로 보낸다', async () => {
    savePendingInvitation('ABCD2345');
    verifyWith('FULL');
    render(<BunchJoinEntry />, { wrapper: Providers });

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.start));
    expect(toast).toHaveBeenCalledWith('최대 인원을 초과한 번치입니다.');
    expect(readPendingInvitation()).toBeNull();
  });

  it('없거나 만료된 초대(INVITE_001)는 유효하지 않은 링크로 알리고 지운다', async () => {
    savePendingInvitation('ABCD2345');
    server.use(http.post('/api/invitations/verify', () => fail(404, 'INVITE_001')));
    render(<BunchJoinEntry />, { wrapper: Providers });

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.start));
    expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.');
    expect(readPendingInvitation()).toBeNull();
  });

  it('일시적 오류는 알리고 초대는 보관한 채 번치 시작으로 보낸다', async () => {
    savePendingInvitation('ABCD2345');
    server.use(http.post('/api/invitations/verify', () => fail(503, 'AUTH_018')));
    render(<BunchJoinEntry />, { wrapper: Providers });

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.start));
    expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
    expect(readPendingInvitation()).toBe('ABCD2345');
  });

  it('보관된 초대가 없으면 서버에 묻지 않고 번치 시작으로 보낸다', async () => {
    let called = false;
    server.use(
      http.post('/api/invitations/verify', () => {
        called = true;
        return ok({ card: { ...CARD, imageUrl: null }, eligibility: 'AVAILABLE' });
      }),
    );
    render(<BunchJoinEntry />, { wrapper: Providers });

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.start));
    expect(called).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
});
