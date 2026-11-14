import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresenceSender } from './usePresenceSender';

const send = vi.fn((_body: Record<string, unknown>) => true);
const bodies = () => send.mock.calls.map(([body]) => body);

beforeEach(() => {
  vi.useFakeTimers();
  send.mockClear();
});
afterEach(() => vi.useRealTimers());

type Props = { connected: boolean; viewing: boolean; participant: boolean };

const render = (overrides: Partial<Props> = {}) =>
  renderHook((props: Props) => usePresenceSender({ send, ...props }), {
    initialProps: { connected: true, viewing: true, participant: true, ...overrides },
  });

describe('usePresenceSender', () => {
  it('입장하면 VIEW를 바로 보내고 5초마다 다시 보낸다', () => {
    render();
    expect(bodies()).toEqual([{ action: 'VIEW' }]);

    act(() => void vi.advanceTimersByTime(5_000));
    expect(bodies()).toEqual([{ action: 'VIEW' }, { action: 'VIEW' }]);
  });

  it('연결되지 않았으면 아무것도 보내지 않는다', () => {
    const { result } = render({ connected: false });
    act(() => result.current.begin('DATE'));
    act(() => result.current.type('TITLE', '가'));

    expect(send).not.toHaveBeenCalled();
  });

  it('비텍스트 작업은 BEGIN을 바로 보내고 5초마다 VIEW와 함께 갱신하며 END는 그 target만 끝낸다', () => {
    const { result } = render();
    send.mockClear();

    act(() => result.current.begin('DATE'));
    act(() => result.current.begin('PHOTOS'));
    act(() => result.current.begin('DATE'));
    expect(bodies()).toEqual([
      { action: 'BEGIN', target: 'DATE' },
      { action: 'BEGIN', target: 'PHOTOS' },
    ]);

    send.mockClear();
    act(() => void vi.advanceTimersByTime(5_000));
    expect(bodies()).toEqual([
      { action: 'VIEW' },
      { action: 'BEGIN', target: 'DATE' },
      { action: 'BEGIN', target: 'PHOTOS' },
    ]);

    send.mockClear();
    act(() => result.current.end('DATE'));
    act(() => void vi.advanceTimersByTime(5_000));
    expect(bodies()).toEqual([
      { action: 'END', target: 'DATE' },
      { action: 'VIEW' },
      { action: 'BEGIN', target: 'PHOTOS' },
    ]);
  });

  it('제목·코멘트는 입력할 때마다 현재 전체 글자를 TYPE으로 보내고 나가면 BLUR를 보낸다', () => {
    const { result } = render();
    send.mockClear();

    act(() => result.current.type('TITLE', '부산'));
    act(() => result.current.type('COMMENT', ''));
    act(() => result.current.blur('TITLE'));

    expect(bodies()).toEqual([
      { action: 'TYPE', target: 'TITLE', text: '부산' },
      { action: 'TYPE', target: 'COMMENT', text: '' },
      { action: 'BLUR', target: 'TITLE' },
    ]);
  });

  it('참여 멤버가 아니면 VIEW만 보내고 BEGIN·TYPE는 보내지 않는다', () => {
    const { result } = render({ participant: false });
    send.mockClear();

    act(() => result.current.begin('DATE'));
    act(() => result.current.type('TITLE', '가'));
    act(() => void vi.advanceTimersByTime(5_000));

    expect(bodies()).toEqual([{ action: 'VIEW' }]);
  });

  it('탭이 보이지 않게 되면 BACKGROUND, 다시 보이면 VIEW와 진행 중인 작업을 다시 알린다', () => {
    const { result } = render();
    act(() => result.current.begin('DATE'));
    send.mockClear();

    const setVisibility = (state: DocumentVisibilityState) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
      act(() => void document.dispatchEvent(new Event('visibilitychange')));
    };
    setVisibility('hidden');
    setVisibility('visible');

    expect(bodies()).toEqual([
      { action: 'BACKGROUND' },
      { action: 'VIEW' },
      { action: 'BEGIN', target: 'DATE' },
    ]);
  });
});
