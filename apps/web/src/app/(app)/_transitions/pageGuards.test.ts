import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guardPush, guardOutgoing, guardSheet, guardZoom, playAfterPaint } from './pageGuards';

type Disposal = { reason: 'finished'; owns: (_element: HTMLElement) => boolean };
type Track = { element: HTMLElement; onDispose?: (_context: Disposal) => void };

// SSGOI 애니메이션 대신 그룹별 track만 돌려주는 가짜
const fakeAnimation = (tracks: Record<string, Track | undefined>) =>
  ({
    select: (group: string) => ({ getMotionTracks: () => (tracks[group] ? [tracks[group]] : []) }),
  }) as never;
const owned = (owns = true): Disposal => ({ reason: 'finished', owns: () => owns });
const screen = (id: string, background?: string) => {
  const element = document.createElement('div');
  element.dataset.ssgoiTransition = id;
  if (background) {
    const inner = document.createElement('div');
    inner.dataset.appBackground = background;
    element.append(inner);
  }
  return element;
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('guardOutgoing', () => {
  it('나가는 화면에 inert·표식을 붙이고 들어오는 화면은 다시 조작 가능하게 둔다', () => {
    const incoming = screen('in');
    incoming.inert = true;
    incoming.dataset.pageLeaving = '';
    incoming.dataset.sheetMoving = '';
    const outgoing = screen('out');

    guardOutgoing(fakeAnimation({ in: { element: incoming }, out: { element: outgoing } }));

    expect(incoming.inert).toBe(false);
    expect(incoming.dataset.pageLeaving).toBeUndefined();
    expect(incoming.dataset.sheetMoving).toBeUndefined();
    expect(outgoing.inert).toBe(true);
    expect(outgoing.dataset.pageLeaving).toBe('');
  });

  it('정리할 때 기존 onDispose를 먼저 부르고 원래 inert로 되돌린다', () => {
    const outgoing = screen('out');
    const seen: Array<{ inert: boolean; leaving: string | undefined }> = [];
    const track: Track = {
      element: outgoing,
      onDispose: () => seen.push({ inert: outgoing.inert, leaving: outgoing.dataset.pageLeaving }),
    };

    guardOutgoing(fakeAnimation({ in: { element: screen('in') }, out: track }));
    track.onDispose?.(owned());

    expect(seen).toEqual([{ inert: true, leaving: '' }]);
    expect(outgoing.inert).toBe(false);
    expect(outgoing.dataset.pageLeaving).toBeUndefined();
  });

  it('다른 전환이 화면을 이어받았으면 표식을 그대로 둔다', () => {
    const outgoing = screen('out');
    const track: Track = { element: outgoing };

    guardOutgoing(fakeAnimation({ in: { element: screen('in') }, out: track }));
    track.onDispose?.(owned(false));

    expect(outgoing.inert).toBe(true);
    expect(outgoing.dataset.pageLeaving).toBe('');
  });
});

describe('guardZoom', () => {
  it('열 때는 같은 id 중 마지막 뒤 화면을 나가는 화면으로, 닫을 때는 앞 화면을 나가는 화면으로 둔다', () => {
    const parent = document.createElement('div');
    const staleBehind = screen('feed');
    const behind = screen('feed');
    const front = screen('detail');
    parent.append(staleBehind, behind, front);
    const animation = fakeAnimation({ content: { element: front } });

    guardZoom(
      true,
      ['other', 'feed'],
      'detail',
    )({ animation, context: { positionedParent: parent } });
    expect(behind.dataset.pageLeaving).toBe('');
    expect(staleBehind.dataset.pageLeaving).toBeUndefined();
    expect(front.inert).toBe(false);

    guardZoom(
      false,
      ['feed'],
      'detail',
    )({
      animation: fakeAnimation({ tile: { element: behind } }),
      context: { positionedParent: parent },
    });
    expect(front.dataset.pageLeaving).toBe('');
    expect(behind.dataset.pageLeaving).toBeUndefined();
  });

  it('열리는 상세 화면에 상태 바 띠와 zoom 띠 표식을 붙이고 전환이 끝나면 치운다(#568)', () => {
    const parent = document.createElement('div');
    const behind = screen('feed');
    const front = screen('detail');
    parent.append(behind, front);
    const track: Track = { element: front };

    guardZoom(
      true,
      ['feed'],
      'detail',
    )({ animation: fakeAnimation({ content: track }), context: { positionedParent: parent } });
    expect(front.dataset.pushBand).toBe('');
    expect(front.dataset.zoomBand).toBe('');
    expect(front.style.boxShadow).toContain('safe-area-top');
    expect(behind.dataset.zoomBand).toBeUndefined();
    expect(behind.dataset.pushBand).toBe('');

    track.onDispose?.(owned());
    expect(behind.dataset.pushBand).toBeUndefined();
    expect(front.dataset.pushBand).toBeUndefined();
    expect(front.dataset.zoomBand).toBeUndefined();
    expect(front.style.boxShadow).toBe('');
  });
});

describe('guardSheet', () => {
  let frames: Map<number, FrameRequestCallback>;
  let offset: number;
  const runFrame = () => {
    const id: number | undefined = Array.from(frames.keys())[0];
    if (id === undefined) throw new Error('예약된 프레임 없음');
    const callback = frames.get(id);
    frames.delete(id);
    callback?.(0);
  };

  beforeEach(() => {
    frames = new Map();
    offset = 0;
    let nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(nextId, callback);
      return nextId++;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal(
      'DOMMatrixReadOnly',
      class {
        m42 = offset;
      },
    );
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  const open = (sheetElement: HTMLElement, opening = true) => {
    const parent = document.createElement('div');
    const behind = screen('home', 'brand');
    parent.append(behind, sheetElement);
    const track: Track = { element: sheetElement };
    guardSheet(
      opening,
      'home',
    )({
      animation: fakeAnimation({ sheet: track }),
      context: { positionedParent: parent },
    });
    return { behind, track };
  };

  it('올라오는 동안 뒤 화면 색을 시트에 옮기고 실제 위치로 도착을 판단한다', () => {
    const sheetElement = screen('sheet');
    const { behind } = open(sheetElement);

    expect(behind.dataset.pageLeaving).toBe('');
    expect(sheetElement.dataset.sheetMoving).toBe('');
    expect(sheetElement.dataset.sheetBand).toBe('');
    expect(sheetElement.dataset.appBackground).toBe('brand');
    expect(sheetElement.style.boxShadow).not.toBe('');

    // 움직이기 전(0px)에는 도착으로 보지 않음
    runFrame();
    expect(sheetElement.dataset.sheetArrived).toBeUndefined();
    offset = 800;
    runFrame();
    offset = 500;
    runFrame();
    expect(sheetElement.dataset.appBackground).toBe('brand');
    // 가장 먼 거리의 절반을 지나면 배경 색을 넘김
    offset = 300;
    runFrame();
    expect(sheetElement.dataset.appBackground).toBeUndefined();
    expect(sheetElement.dataset.sheetMoving).toBe('');
    offset = 0.5;
    runFrame();
    expect(sheetElement.dataset.sheetMoving).toBeUndefined();
    expect(sheetElement.dataset.sheetArrived).toBe('');
    expect(frames.size).toBe(0);
  });

  it('닫을 때는 색을 옮기지 않고 위치도 감시하지 않는다', () => {
    const sheetElement = screen('sheet');
    open(sheetElement, false);

    expect(sheetElement.dataset.appBackground).toBeUndefined();
    expect(sheetElement.dataset.pageLeaving).toBe('');
    expect(frames.size).toBe(0);
  });

  it('끝나면 감시를 멈추고 표식을 지우며 띠는 200ms 뒤에 걷는다', () => {
    const sheetElement = screen('sheet');
    const { behind, track } = open(sheetElement);
    offset = 800;
    runFrame();

    track.onDispose?.(owned());

    expect(frames.size).toBe(0);
    expect(behind.dataset.pageLeaving).toBeUndefined();
    expect(sheetElement.dataset.sheetMoving).toBeUndefined();
    expect(sheetElement.dataset.appBackground).toBeUndefined();
    vi.advanceTimersByTime(199);
    expect(sheetElement.dataset.sheetBand).toBe('');
    vi.advanceTimersByTime(1);
    expect(sheetElement.dataset.sheetBand).toBeUndefined();
    expect(sheetElement.style.boxShadow).toBe('');
  });

  it('중단된 전환은 남긴 표식을 바로 지운다', () => {
    const sheetElement = screen('sheet');
    const { track } = open(sheetElement);

    track.onDispose?.(owned(false));

    expect(frames.size).toBe(0);
    expect(sheetElement.dataset.sheetMoving).toBeUndefined();
    expect(sheetElement.dataset.sheetBand).toBeUndefined();
    expect(sheetElement.dataset.appBackground).toBeUndefined();
  });

  it('같은 요소를 새 전환이 맡으면 이전 전환의 정리는 새 표식을 건드리지 않는다', () => {
    const sheetElement = screen('sheet');
    const first = open(sheetElement);
    open(sheetElement);

    first.track.onDispose?.(owned());
    vi.runAllTimers();

    expect(sheetElement.dataset.sheetMoving).toBe('');
    expect(sheetElement.dataset.sheetBand).toBe('');
    expect(sheetElement.dataset.appBackground).toBe('brand');
    expect(frames.size).toBe(1);
  });
});

describe('guardPush', () => {
  it('두 화면에 자기 배경색의 상태 바 띠를 붙이고 나가는 화면 표식도 붙인다', () => {
    const incoming = screen('in');
    const outgoing = screen('out', 'brand-subtle-1');

    guardPush(fakeAnimation({ in: { element: incoming }, out: { element: outgoing } }));

    expect(incoming.dataset.pushBand).toBe('');
    expect(incoming.style.boxShadow).toContain('var(--color-surface-primary)');
    expect(outgoing.dataset.pushBand).toBe('');
    expect(outgoing.style.boxShadow).toContain('var(--color-surface-brand-subtle-1)');
    expect(outgoing.dataset.pageLeaving).toBe('');
  });

  it('투명 배경 화면(로그인 영상)에는 띠를 붙이지 않는다', () => {
    const incoming = screen('in', 'transparent');

    guardPush(fakeAnimation({ in: { element: incoming }, out: { element: screen('out') } }));

    expect(incoming.dataset.pushBand).toBeUndefined();
    expect(incoming.style.boxShadow).toBe('');
  });

  it('같은 화면에 sheet 띠가 남아 있으면 화면 이동 정리가 그 띠를 지우지 않는다', () => {
    const page = screen('in');
    const track: Track = { element: page };
    guardPush(fakeAnimation({ in: track, out: { element: screen('out') } }));
    page.dataset.sheetBand = '';

    track.onDispose?.(owned());

    expect(page.dataset.pushBand).toBeUndefined();
    expect(page.style.boxShadow).not.toBe('');
  });

  it('전환이 끝나면 띠를 걷고, 같은 화면을 새 전환이 맡았으면 이전 정리가 새 띠를 지우지 않는다', () => {
    const page = screen('in', 'secondary');
    const first: Track = { element: page };
    guardPush(fakeAnimation({ in: first, out: { element: screen('out') } }));
    const second: Track = { element: page };
    guardPush(fakeAnimation({ in: second, out: { element: screen('out') } }));

    first.onDispose?.(owned());
    expect(page.dataset.pushBand).toBe('');

    second.onDispose?.(owned());
    expect(page.dataset.pushBand).toBeUndefined();
    expect(page.style.boxShadow).toBe('');
  });
});

describe('playAfterPaint', () => {
  const frames = () => {
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      queue.push(callback),
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      if (id) queue[id - 1] = () => {};
    });
    return () => queue.splice(0).forEach((callback) => callback(0));
  };

  it('첫 재생은 시작 모습에서 멈췄다가 두 프레임 뒤에 이어 가고, 다음 재생은 바로 한다(#573)', () => {
    const flush = frames();
    const calls: string[] = [];
    const animation = { play: () => calls.push('play'), pause: () => calls.push('pause') };
    playAfterPaint(animation);

    animation.play();
    expect(calls).toEqual(['play', 'pause']);
    flush();
    expect(calls).toEqual(['play', 'pause']);
    flush();
    expect(calls).toEqual(['play', 'pause', 'play']);

    animation.play();
    expect(calls).toEqual(['play', 'pause', 'play', 'play']);
  });

  it('기다리는 사이 멈추거나 되돌리면 이어 가지 않고 원래 동작만 한다', () => {
    const flush = frames();
    const play = vi.fn();
    const reverse = vi.fn();
    const animation = { play, pause: vi.fn(), reverse };
    playAfterPaint(animation);

    animation.play();
    animation.reverse();
    flush();
    flush();
    expect(play).toHaveBeenCalledTimes(1);
    expect(reverse).toHaveBeenCalledTimes(1);
  });
});
