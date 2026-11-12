import { afterEach, describe, expect, it, vi } from 'vitest';
import { openExternal } from './navigation';

afterEach(() => vi.restoreAllMocks());

describe('openExternal', () => {
  it('브라우저에서는 https 주소를 새 탭으로 연다', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    expect(openExternal('https://open.kakao.example/o/channel')).toBe(true);

    expect(open).toHaveBeenCalledWith(
      'https://open.kakao.example/o/channel',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it.each(['javascript:alert(1)', 'http://open.kakao.example/o/channel', 'not a url'])(
    'https가 아닌 주소(%s)는 열지 않는다',
    (url) => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null);

      expect(openExternal(url)).toBe(false);

      expect(open).not.toHaveBeenCalled();
    },
  );
});
