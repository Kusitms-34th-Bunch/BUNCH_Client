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
import { BunchJoin } from './BunchJoin';

const replace = vi.fn();
const push = vi.fn();
type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push }) }));
// DS 토스트 렌더링을 제외하고 호출 인자만 검증
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const Query = createQueryWrapper();
const Providers = ({ children }: { children: ReactNode }) => (
  <Query>
    <JoinInvitationProvider>{children}</JoinInvitationProvider>
  </Query>
);
const renderJoin = () => render(<BunchJoin />, { wrapper: Providers });
const CARD = {
  name: '여행가조',
  introduction: '소개',
  inviterNickname: '민지',
  code: 'ABCD2345',
  characterType: 'TYPE_1',
};
const verifyWith = (eligibility: string, capture?: (_body: unknown) => void) =>
  server.use(
    http.post('/api/invitations/verify', async ({ request }) => {
      capture?.(await request.json());
      return ok({ card: { ...CARD, imageUrl: null }, eligibility });
    }),
  );

const LINK = 'https://bunch.app/invite/7xK9mP2q';
const input = () => screen.getByRole('textbox', { name: '초대 링크' });
const done = () => screen.getByRole('button', { name: '완료' });
const readText = vi.fn();
const setClipboard = (clipboard: unknown) =>
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });

describe('BunchJoin', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    toast.mockClear();
    readText.mockReset().mockResolvedValue(LINK);
    setClipboard({ readText });
  });

  it('제목·본문(main)·링크 입력창·붙여넣기를 보여 준다', () => {
    renderJoin();

    expect(
      screen.getByRole('heading', { level: 1, name: '초대받은 번치에 참여해볼까요?' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(input().getAttribute('placeholder')).toBe('초대 링크를 붙여넣어 주세요');
    expect(screen.getByRole('button', { name: '붙여넣기' })).toBeTruthy();
  });

  it('입력 전에는 완료가 비활성이고 입력하면 활성화된다', async () => {
    renderJoin();
    expect((done() as HTMLButtonElement).disabled).toBe(true);

    await userEvent.type(input(), 'a');

    expect((done() as HTMLButtonElement).disabled).toBe(false);
  });

  it('공백만 입력하면 완료는 비활성이다', async () => {
    renderJoin();

    await userEvent.type(input(), '   ');

    expect((done() as HTMLButtonElement).disabled).toBe(true);
  });

  it('붙여넣기에 성공하면 클립보드의 링크를 입력창에 채우고 키보드가 올라오지 않게 초점은 주지 않는다', async () => {
    readText.mockResolvedValue(`  ${LINK}\n`);
    renderJoin();

    await userEvent.click(screen.getByRole('button', { name: '붙여넣기' }));

    await waitFor(() => expect(input()).toHaveProperty('value', LINK));
    expect(document.activeElement).not.toBe(input());
    expect((done() as HTMLButtonElement).disabled).toBe(false);
    // 초점 대신 상태 알림으로 채워진 것을 전하고, 직접 고치면 사라짐
    expect(screen.getByRole('status').textContent).toBe('초대 링크를 붙여넣었어요');
    await userEvent.type(input(), 'x');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('클립보드를 읽지 못하면 입력창에 초점을 준다', async () => {
    readText.mockRejectedValue(new Error('denied'));
    renderJoin();

    await userEvent.click(screen.getByRole('button', { name: '붙여넣기' }));

    await waitFor(() => expect(document.activeElement).toBe(input()));
    expect(input()).toHaveProperty('value', '');
  });

  it('형식이 틀린 링크로 완료하면 유효하지 않은 링크 토스트를 완료 위에 띄운다', async () => {
    renderJoin();
    await userEvent.type(input(), 'https://example.com/잘못된링크');

    await userEvent.click(done());

    expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.');
    expect(push).not.toHaveBeenCalled();
  });

  it('형식이 맞는 링크는 서버에 확인하고, 참여할 수 있으면 확인한 카드를 남기고 초대 확인 화면으로 이동한다', async () => {
    let sent: unknown;
    verifyWith('AVAILABLE', (body) => (sent = body));
    const Probe = () => (
      <output aria-label="확인한 초대">
        {useJoinInvitationFlow().verified?.card.name ?? '없음'}
      </output>
    );
    render(
      <>
        <BunchJoin />
        <Probe />
      </>,
      { wrapper: Providers },
    );
    await userEvent.type(input(), `  ${LINK}`);

    await userEvent.click(done());

    await waitFor(() => expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchInvitation));
    expect(sent).toEqual({ invitation: LINK });
    expect(screen.getByLabelText('확인한 초대').textContent).toBe('여행가조');
    expect(toast).not.toHaveBeenCalled();
  });

  it('보조 코드도 서버에 확인한다', async () => {
    let sent: unknown;
    verifyWith('AVAILABLE', (body) => (sent = body));
    renderJoin();
    await userEvent.type(input(), 'abcd2345');

    await userEvent.click(done());

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(sent).toEqual({ invitation: 'abcd2345' });
  });

  it.each([
    ['FULL', '최대 인원을 초과한 번치입니다.'],
    ['LIMIT_EXCEEDED', '참여할 수 있는 번치는 최대 10개예요.'],
  ])('서버가 %s로 알리면 토스트를 띄우고 입력값을 그대로 둔다', async (eligibility, message) => {
    verifyWith(eligibility);
    renderJoin();
    await userEvent.type(input(), LINK);

    await userEvent.click(done());

    await waitFor(() => expect(toast).toHaveBeenCalledWith(message));
    expect(push).not.toHaveBeenCalled();
    expect(input()).toHaveProperty('value', LINK);
  });

  it('이미 참여 중인 번치면 오류로 막지 않고 알린 뒤 번치로 이동한다', async () => {
    verifyWith('ALREADY_MEMBER');
    renderJoin();
    await userEvent.type(input(), LINK);

    await userEvent.click(done());

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed));
    expect(toast).toHaveBeenCalledWith('이미 참여 중인 번치예요.');
    expect(push).not.toHaveBeenCalled();
  });

  it('없거나 만료된 초대(INVITE_001)는 유효하지 않은 링크 토스트를 띄운다', async () => {
    server.use(http.post('/api/invitations/verify', () => fail(404, 'INVITE_001')));
    renderJoin();
    await userEvent.type(input(), LINK);

    await userEvent.click(done());

    await waitFor(() => expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.'));
    expect(push).not.toHaveBeenCalled();
  });

  it('그 밖의 오류는 일시적 오류 토스트를 띄우고 다시 시도할 수 있다', async () => {
    server.use(http.post('/api/invitations/verify', () => fail(429, 'REQUEST_002')));
    renderJoin();
    await userEvent.type(input(), LINK);

    await userEvent.click(done());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect((done() as HTMLButtonElement).disabled).toBe(false);
  });

  it('뒤로 가기는 중단 확인 모달을 열고 계속 참여하기는 모달만 닫는다', async () => {
    renderJoin();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('번치 참여를 그만둘까요?')).toBeTruthy();
    expect(
      within(dialog).getByText('지금 나가면 번치에 참여하지 않고 피드로 이동해요.'),
    ).toBeTruthy();

    await userEvent.click(within(dialog).getByRole('button', { name: '계속 참여하기' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(replace).not.toHaveBeenCalled();
  });

  it('모달의 나가기는 닫힘이 끝난 뒤 피드로 이동한다', async () => {
    renderJoin();
    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
    const dialog = await screen.findByRole('alertdialog');

    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.feed));
  });
});
