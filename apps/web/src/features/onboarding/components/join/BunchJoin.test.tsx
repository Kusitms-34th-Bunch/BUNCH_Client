import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
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

const Providers = ({ children }: { children: ReactNode }) => (
  <OverlayProvider>{children}</OverlayProvider>
);
const renderJoin = (props: Parameters<typeof BunchJoin>[0] = {}) =>
  render(<BunchJoin {...props} />, { wrapper: Providers });

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

  it('붙여넣기를 누르면 클립보드의 링크를 입력창에 채우고 초점을 준다', async () => {
    readText.mockResolvedValue(`  ${LINK}\n`);
    renderJoin();

    await userEvent.click(screen.getByRole('button', { name: '붙여넣기' }));

    await waitFor(() => expect(input()).toHaveProperty('value', LINK));
    expect(document.activeElement).toBe(input());
    expect((done() as HTMLButtonElement).disabled).toBe(false);
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

    expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.', {
      bottomOffset: 42,
      fullWidth: true,
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('형식이 맞는 링크는 onSubmit에 넘기고 성공하면 로딩(초대장 로티) 화면으로 이동한다', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    renderJoin({ onSubmit });
    await userEvent.type(input(), LINK);

    await userEvent.click(done());

    await waitFor(() => expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchMotion));
    expect(onSubmit).toHaveBeenCalledWith(LINK);
    expect(toast).not.toHaveBeenCalled();
  });

  it('서버가 인원 초과를 알리면 그 토스트를 띄운다', async () => {
    const onSubmit = vi.fn().mockResolvedValue('full');
    renderJoin({ onSubmit });
    await userEvent.type(input(), LINK);

    await userEvent.click(done());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('최대 인원을 초과한 번치입니다.', {
        bottomOffset: 42,
        fullWidth: true,
      }),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('onSubmit이 없으면(링크 확인 API 연결 전) 형식이 맞는 링크로 완료하면 바로 로딩 화면으로 이동한다', async () => {
    renderJoin();
    await userEvent.type(input(), LINK);

    await userEvent.click(done());

    await waitFor(() => expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.joinBunchMotion));
    expect(toast).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
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
