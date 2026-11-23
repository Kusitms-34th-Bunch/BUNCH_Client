import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guardOutgoing, guardSheet, guardZoom } from './pageGuards';

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
