import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playHaptic } from './haptic';

const shell = vi.hoisted(() => ({
  inShell: false,
  feedbackHaptic: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => shell.inShell,
  appBridge: { feedbackHaptic: shell.feedbackHaptic },
}));

describe('playHaptic', () => {
  beforeEach(() => shell.feedbackHaptic.mockClear());

  it('앱 쉘에서는 쉘에 햅틱 종류를 보낸다', () => {
    shell.inShell = true;
    playHaptic('success');
    expect(shell.feedbackHaptic).toHaveBeenCalledWith('success');
  });

  it('브라우저에서는 아무것도 하지 않는다', () => {
    shell.inShell = false;
    playHaptic('tap');
    expect(shell.feedbackHaptic).not.toHaveBeenCalled();
  });

  it('숨은 탭 WebView에서는 울리지 않는다', () => {
    shell.inShell = true;
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    playHaptic('tap');
    expect(shell.feedbackHaptic).not.toHaveBeenCalled();
    visibility.mockRestore();
  });

  it('이전 쉘처럼 햅틱이 실패해도 거절을 삼킨다', async () => {
    shell.inShell = true;
    const failure = Promise.reject(new Error('없음'));
    const caught = vi.spyOn(failure, 'catch');
    shell.feedbackHaptic.mockReturnValueOnce(failure);
    playHaptic('tap');
    expect(caught).toHaveBeenCalledOnce();
    await expect(caught.mock.results[0]?.value).resolves.toBeUndefined();
  });
});
