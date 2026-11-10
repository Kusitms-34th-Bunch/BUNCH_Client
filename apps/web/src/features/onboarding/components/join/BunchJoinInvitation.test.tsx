import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useJoinInvitationFlow } from '../../contexts/joinInvitationContext';
import { JoinInvitationProvider } from '../../contexts/JoinInvitationProvider';
import { BunchJoinInvitation } from './BunchJoinInvitation';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

type Verified = {
  invitation: string;
  card: { name: string; introduction?: string; inviterNickname?: string };
};
const VERIFIED: Verified = {
  invitation: 'ABCD2345',
  card: {
    name: '여행가조',
    introduction: '틈만 나면 떠나는 여행 좋아하는 네 명',
    inviterNickname: '민지',
  },
};
const BUNCH = { id: 3, name: '여행가조', characterType: 'TYPE_3', imageUrl: null };

const withVerified = (verified: Verified | null) => {
  const Query = createQueryWrapper();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Query>
        <JoinInvitationProvider {...(verified ? { initial: { verified } } : {})}>
          {children}
        </JoinInvitationProvider>
      </Query>
    );
  };
};
const renderInvitation = (verified: Verified | null = VERIFIED) =>
  render(<BunchJoinInvitation />, { wrapper: withVerified(verified) });
const joinButton = () => screen.getByRole('button', { name: '참여하기' });

describe('BunchJoinInvitation', () => {
  beforeEach(() => {
    replace.mockClear();
    toast.mockClear();
  });

  it('제목과 본문(main), 서버가 확인한 초대 카드(번치 이름·소개·초대한 사람)를 보여 준다', () => {
    renderInvitation();

    expect(
      screen.getByRole('heading', { level: 1, name: '초대받은 번치에 참여할까요?' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    const card = screen.getByRole('article', { name: '여행가조' });
    expect(within(card).getByText('틈만 나면 떠나는 여행 좋아하는 네 명')).toBeTruthy();
    expect(card.textContent).toContain('From. 민지 님');
  });

  it('소개와 초대한 사람이 없으면 해당 줄을 숨긴다', () => {
    renderInvitation({ invitation: 'ABCD2345', card: { name: '여행가조' } });

    const card = screen.getByRole('article', { name: '여행가조' });
    expect(card.textContent).not.toContain('From.');
  });

  it('확인한 초대 없이 직접 들어오면 화면을 그리지 않고 링크 입력으로 되돌린다', () => {
    renderInvitation(null);

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunch);
  });

  it('참여하기는 멱등 키와 함께 서버에 참여하고 결과를 남긴 뒤 완료 화면으로 replace한다', async () => {
    let sent: { key: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/invitations/join', async ({ request }) => {
        sent = { key: request.headers.get('idempotency-key'), body: await request.json() };
        return ok({ outcome: 'JOINED', bunch: BUNCH });
      }),
    );
    const Probe = () => (
      <output aria-label="참여한 번치">
        {useJoinInvitationFlow().joinedBunch?.name ?? '없음'}
      </output>
    );
    render(
      <>
        <BunchJoinInvitation />
        <Probe />
      </>,
      { wrapper: withVerified(VERIFIED) },
    );

    await userEvent.click(joinButton());
    await userEvent.click(joinButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchComplete));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(sent?.body).toEqual({ invitation: 'ABCD2345' });
    expect(sent?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByLabelText('참여한 번치').textContent).toBe('여행가조');
  });

  it('이미 참여 중이면(ALREADY_MEMBER) 알린 뒤 번치로 이동하고 완료 화면으로 가지 않는다', async () => {
    server.use(
      http.post('/api/invitations/join', () => ok({ outcome: 'ALREADY_MEMBER', bunch: BUNCH })),
    );
    renderInvitation();

    await userEvent.click(joinButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed));
    expect(toast).toHaveBeenCalledWith('이미 참여 중인 번치예요.');
    expect(replace).not.toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchComplete);
  });

  it.each([
    [404, 'INVITE_001', '유효하지 않은 링크입니다.'],
    [409, 'BUNCH_002', '최대 인원을 초과한 번치입니다.'],
    [409, 'BUNCH_003', '참여할 수 있는 번치는 최대 10개예요.'],
  ])(
    '%s %s는 이유를 알리고 다시 해도 안 되므로 참여하기를 잠근다',
    async (status, code, message) => {
      server.use(http.post('/api/invitations/join', () => fail(status, code)));
      renderInvitation();

      await userEvent.click(joinButton());

      await waitFor(() => expect(toast).toHaveBeenCalledWith(message));
      await waitFor(() => expect(joinButton()).toHaveProperty('disabled', true));
      expect(replace).not.toHaveBeenCalled();
    },
  );

  it('네트워크·서버 오류는 일시적 오류로 알리고 같은 멱등 키로 다시 참여할 수 있다', async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.post('/api/invitations/join', ({ request }) => {
        keys.push(request.headers.get('idempotency-key'));
        return keys.length === 1 ? fail(503, 'AUTH_018') : ok({ outcome: 'JOINED', bunch: BUNCH });
      }),
    );
    renderInvitation();

    await userEvent.click(joinButton());
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(joinButton()).toHaveProperty('disabled', false);
    await userEvent.click(joinButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchComplete));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
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
