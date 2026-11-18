import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
  native: false,
  available: true,
  copyToClipboard: vi.fn<(_text: string) => Promise<boolean>>(),
  readClipboard: vi.fn<() => Promise<string | null>>(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => bridge.native,
  appBridge: {
    isNativeMethodAvailable: () => bridge.available,
    copyToClipboard: (text: string) => bridge.copyToClipboard(text),
  },
  clipboardBridge: { readClipboard: () => bridge.readClipboard() },
}));

import { copyText, readClipboardText } from './clipboard';

const setClipboard = (clipboard: unknown) =>
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });

describe('clipboard', () => {
  beforeEach(() => {
    bridge.native = false;
    bridge.available = true;
    bridge.copyToClipboard.mockReset();
    bridge.readClipboard.mockReset();
  });
  afterEach(() => setClipboard(undefined));

  describe('브라우저', () => {
    it('복사는 navigator.clipboard로 쓰고 성공을 알린다', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ writeText });

      await expect(copyText('링크')).resolves.toBe(true);
      expect(writeText).toHaveBeenCalledWith('링크');
      expect(bridge.copyToClipboard).not.toHaveBeenCalled();
    });

    it('navigator.clipboard가 없거나 거부되면 복사는 false다', async () => {
      setClipboard(undefined);
      await expect(copyText('링크')).resolves.toBe(false);

      setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
      await expect(copyText('링크')).resolves.toBe(false);
    });

    it('읽기는 앞뒤 공백을 지우고, 비었거나 실패하면 null이다', async () => {
      setClipboard({ readText: vi.fn().mockResolvedValue('  abc  ') });
      await expect(readClipboardText()).resolves.toBe('abc');

      setClipboard({ readText: vi.fn().mockResolvedValue('   ') });
      await expect(readClipboardText()).resolves.toBeNull();

      setClipboard({ readText: vi.fn().mockRejectedValue(new Error('denied')) });
      await expect(readClipboardText()).resolves.toBeNull();

      setClipboard(undefined);
      await expect(readClipboardText()).resolves.toBeNull();
    });
  });

  describe('앱 쉘', () => {
    beforeEach(() => {
      bridge.native = true;
      // 쉘에서는 http 개발 주소라 navigator.clipboard가 없음
      setClipboard(undefined);
    });

    it('navigator.clipboard 없이도 브리지로 복사한다', async () => {
      bridge.copyToClipboard.mockResolvedValue(true);

      await expect(copyText('링크')).resolves.toBe(true);
      expect(bridge.copyToClipboard).toHaveBeenCalledWith('링크');
    });

    it('브리지가 false를 주거나 던져도 복사는 false다', async () => {
      bridge.copyToClipboard.mockResolvedValueOnce(false);
      await expect(copyText('링크')).resolves.toBe(false);

      bridge.copyToClipboard.mockRejectedValueOnce(new Error('bridge'));
      await expect(copyText('링크')).resolves.toBe(false);
    });

    it('브리지로 클립보드를 읽고, 비었거나 실패하면 null이다', async () => {
      bridge.readClipboard.mockResolvedValueOnce('https://app.bunch.kr/invite/abc');
      await expect(readClipboardText()).resolves.toBe('https://app.bunch.kr/invite/abc');

      bridge.readClipboard.mockResolvedValueOnce(null);
      await expect(readClipboardText()).resolves.toBeNull();

      bridge.readClipboard.mockRejectedValueOnce(new Error('bridge'));
      await expect(readClipboardText()).resolves.toBeNull();
    });

    it('이전 쉘 빌드(메서드 없음)에서는 브라우저 방식으로 대체한다', async () => {
      bridge.available = false;
      const writeText = vi.fn().mockResolvedValue(undefined);
      setClipboard({ writeText });

      await expect(copyText('링크')).resolves.toBe(true);
      expect(writeText).toHaveBeenCalledWith('링크');
      expect(bridge.copyToClipboard).not.toHaveBeenCalled();
    });
  });
});
