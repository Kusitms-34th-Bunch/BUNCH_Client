import { act, render, renderHook } from '@testing-library/react';
import { memo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftPresence, PresenceData } from '../lib/presence';
import { type PresenceState, usePresence } from './usePresence';

const getBundlePresence = vi.hoisted(() => vi.fn());
vi.mock('../api/bundles', () => ({ getBundlePresence }));

const NOW = Date.UTC(2026, 10, 13, 12, 0, 0);
const at = (seconds: number) => new Date(NOW + seconds * 1000).toISOString();

const viewers = (...ids: number[]): PresenceData => ({
  members: ids.map((memberId) => ({ memberId, expiresAt: at(15) })),
  typing: [],
  editing: [],
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
  getBundlePresence.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('usePresence', () => {
  it('받은 PRESENCE로 세 배열을 통째로 교체하고 누적하지 않는다', () => {
    const { result } = renderHook(() => usePresence('1', '2'));

    act(() => result.current.apply(viewers(12, 13)));
    expect(result.current.presence.viewingMemberIds).toEqual(['12', '13']);

    act(() => result.current.apply(viewers(13)));
    expect(result.current.presence.viewingMemberIds).toEqual(['13']);
  });

  it('expiresAt이 지나면 새 방송을 기다리지 않고 화면에서 뺀다', () => {
    const { result } = renderHook(() => usePresence('1', '2'));
    act(() =>
      result.current.apply({
        members: [{ memberId: 12, expiresAt: at(15) }],
        typing: [{ memberId: 12, target: 'TITLE', text: '부', expiresAt: at(3) }],
        editing: [],
      }),
    );
    expect(result.current.presence.editing.titleMemberIds).toEqual(['12']);

    // 정확히 expiresAt에 다시 계산하도록 1ms 여유를 둠
    act(() => void vi.advanceTimersByTime(3_001));
    expect(result.current.presence.editing.titleMemberIds).toEqual([]);
    expect(result.current.presence.viewingMemberIds).toEqual(['12']);

    act(() => void vi.advanceTimersByTime(12_000));
    expect(result.current.presence.viewingMemberIds).toEqual([]);
  });

  it('복구 조회 결과로 현재 상태를 교체한다', async () => {
    getBundlePresence.mockResolvedValue(viewers(7));
    const { result } = renderHook(() => usePresence('1', '2'));

    await act(async () => {
      result.current.refresh();
      await Promise.resolve();
    });

    expect(result.current.presence.viewingMemberIds).toEqual(['7']);
    expect(getBundlePresence).toHaveBeenCalledWith('1', '2');
  });

  it('조회하는 사이 더 새 PRESENCE가 도착하면 낡은 조회 결과로 덮지 않는다', async () => {
    let resolve: (_data: PresenceData) => void = () => undefined;
    getBundlePresence.mockReturnValue(new Promise<PresenceData>((done) => (resolve = done)));
    const { result } = renderHook(() => usePresence('1', '2'));

    act(() => result.current.refresh());
    act(() => result.current.apply(viewers(13)));
    await act(async () => {
      resolve(viewers(7));
      await Promise.resolve();
    });

    expect(result.current.presence.viewingMemberIds).toEqual(['13']);
  });

  it('복구 조회가 겹치면 먼저 보낸 조회가 나중에 끝나도 더 늦게 보낸 조회 결과를 덮지 않는다', async () => {
    const resolvers: ((_data: PresenceData) => void)[] = [];
    getBundlePresence.mockImplementation(
      () => new Promise<PresenceData>((done) => resolvers.push(done)),
    );
    const { result } = renderHook(() => usePresence('1', '2'));

    // 첫 연결의 조회 A가 끝나기 전에 재연결 조회 B가 시작됨(그동안 PRESENCE는 없음)
    act(() => result.current.refresh());
    act(() => result.current.refresh());
    await act(async () => {
      resolvers[1]?.(viewers(13));
      await Promise.resolve();
    });
    await act(async () => {
      resolvers[0]?.(viewers(7));
      await Promise.resolve();
    });

    expect(result.current.presence.viewingMemberIds).toEqual(['13']);
  });

  it('복구 조회에 실패해도 현재 상태를 그대로 둔다', async () => {
    getBundlePresence.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => usePresence('1', '2'));
    act(() => result.current.apply(viewers(12)));

    await act(async () => {
      result.current.refresh();
      await Promise.resolve();
    });

    expect(result.current.presence.viewingMemberIds).toEqual(['12']);
  });

  it('만료 시각만 바뀐 같은 내용의 PRESENCE는 화면 값을 새로 만들지 않아 받는 화면이 다시 그려지지 않는다', () => {
    // 작성 화면처럼 presence를 받는 자식(memo)이 실제로 다시 그려진 횟수를 셈
    const childRender = vi.fn();
    const Child = memo(function Child(_props: { presence: DraftPresence }) {
      childRender();
      return null;
    });
    const captured = vi.fn<(_state: PresenceState) => void>();
    const latest = () => captured.mock.lastCall![0];
    function Host() {
      const presenceState = usePresence('1', '2');
      captured(presenceState);
      return <Child presence={presenceState.presence} />;
    }
    render(<Host />);
    act(() => latest().apply(viewers(12, 13)));
    const before = childRender.mock.calls.length;

    // 5초마다 오는 같은 내용의 갱신(서버가 만료 시각만 늘림) 10번
    for (let index = 1; index <= 10; index += 1) {
      act(() =>
        latest().apply({
          members: [12, 13].map((memberId) => ({ memberId, expiresAt: at(15 + index * 5) })),
          typing: [],
          editing: [],
        }),
      );
    }

    expect(childRender.mock.calls.length - before).toBe(0);
    expect(latest().presence.viewingMemberIds).toEqual(['12', '13']);
  });
});
