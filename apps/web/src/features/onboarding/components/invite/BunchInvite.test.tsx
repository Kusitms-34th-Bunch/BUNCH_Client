import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { BunchInvite } from './BunchInvite';

const captureException = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException }));

const replace = vi.fn();
type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
// DS `toast()`의 호출 인자 확인
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const LINK = 'https://bunch.app/invite/7xK9mP2q';
const writeText = vi.fn();
const share = vi.fn();
// 첫 토스트의 「공유」 액션
const shareAction = () => toast.mock.calls[0]![1]!.action!;
// 비동기 공유 완료를 위한 마이크로태스크 처리
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
// getter만 있는 jsdom navigator.clipboard의 대체
const setNavigator = (props: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
};

describe('BunchInvite', () => {
  beforeEach(() => {
    replace.mockClear();
    toast.mockClear();
    captureException.mockClear();
    writeText.mockReset().mockResolvedValue(undefined);
    share.mockReset().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText }, share });
  });

  it('제목·설명·초대 링크·안내를 보여 준다', () => {
    render(<BunchInvite inviteLink={LINK} />);

    expect(
      screen.getByRole('heading', { level: 1, name: '함께 기록할 멤버를 초대해보세요' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: '초대 링크' })).toHaveProperty('value', LINK);
    expect(screen.getByText('번치는 최대 8명까지 함께할 수 있어요.')).toBeTruthy();
  });

  it('링크 입력창은 읽기 전용이다', () => {
    render(<BunchInvite inviteLink={LINK} />);

    expect(screen.getByRole('textbox', { name: '초대 링크' })).toHaveProperty('readOnly', true);
  });

  it('복사 아이콘을 누르면 링크를 복사하고 공유 버튼이 있는 토스트를 띄운다', async () => {
    render(<BunchInvite inviteLink={LINK} />);

    await userEvent.click(screen.getByRole('button', { name: '초대 링크 복사' }));

    expect(writeText).toHaveBeenCalledWith(LINK);
    const [message, options] = toast.mock.calls[0]!;
    expect(message).toBe('초대 링크가 복사되었어요.');
    expect(options?.action?.label).toBe('공유');
    // 「나중에 할게요」를 가리지 않는 Figma 토스트 위치·너비 확인
    expect(options).toMatchObject({ bottomOffset: 32, fullWidth: true });
  });

  it('토스트의 공유를 누르면 링크를 공유한다', async () => {
    render(<BunchInvite inviteLink={LINK} />);
    await userEvent.click(screen.getByRole('button', { name: '초대 링크 복사' }));

    shareAction().onClick();
    await flush();

    expect(share).toHaveBeenCalledWith({ url: LINK });
  });

  it('공유를 지원하지 않으면 복사 성공 토스트에 공유 버튼을 제공하지 않는다', async () => {
    setNavigator({ share: undefined });
    render(<BunchInvite inviteLink={LINK} />);
    await userEvent.click(screen.getByRole('button', { name: '초대 링크 복사' }));

    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(toast.mock.calls[0]![1]?.action).toBeUndefined();
  });

  it('공유 창을 취소하면 실패 안내나 오류 수집을 하지 않는다', async () => {
    share.mockRejectedValue(new DOMException('cancel', 'AbortError'));
    render(<BunchInvite inviteLink={LINK} />);
    await userEvent.click(screen.getByRole('button', { name: '초대 링크 복사' }));

    shareAction().onClick();
    await flush();

    expect(toast).toHaveBeenCalledTimes(1);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('공유가 실패하면 직접 전송 안내와 오류를 남긴다', async () => {
    const error = new DOMException('denied', 'NotAllowedError');
    share.mockRejectedValue(error);
    render(<BunchInvite inviteLink={LINK} />);
    await userEvent.click(screen.getByRole('button', { name: '초대 링크 복사' }));

    shareAction().onClick();
    await flush();

    expect(captureException).toHaveBeenCalledWith(error);
    expect(toast).toHaveBeenLastCalledWith('공유하지 못했어요. 복사한 링크를 직접 보내주세요.', {
      bottomOffset: 32,
    });
  });

  it('복사에 실패하면 실패 토스트를 띄운다', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    render(<BunchInvite inviteLink={LINK} />);

    await userEvent.click(screen.getByRole('button', { name: '초대 링크 복사' }));

    expect(toast).toHaveBeenCalledWith('초대 링크를 복사하지 못했어요.', { bottomOffset: 32 });
  });

  it('닫기와 나중에 할게요는 피드로 replace한다', async () => {
    render(<BunchInvite inviteLink={LINK} />);

    await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: '닫기' }));
    await userEvent.click(screen.getByRole('button', { name: '나중에 할게요' }));

    expect(replace).toHaveBeenNthCalledWith(1, ONBOARDING_PATHS.feed);
    expect(replace).toHaveBeenNthCalledWith(2, ONBOARDING_PATHS.feed);
  });
});
