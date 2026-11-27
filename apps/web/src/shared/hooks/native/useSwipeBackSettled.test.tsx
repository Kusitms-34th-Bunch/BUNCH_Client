import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { SWIPE_BACK_EVENT, useSwipeBackSettled } from './useSwipeBackSettled';

const bridge = vi.hoisted(() => ({
  available: true,
  swipeBackSettled: vi.fn(() => Promise.resolve()),
  pathname: '/photos/1',
}));

vi.mock('next/navigation', () => ({ usePathname: () => bridge.pathname }));
vi.mock('@/shared/bridge/client', () => ({
  hasNativeMethod: () => bridge.available,
  appBridge: { swipeBackSettled: () => bridge.swipeBackSettled() },
}));

const swipe = (active: boolean) =>
  act(() => {
    window.dispatchEvent(new CustomEvent(SWIPE_BACK_EVENT, { detail: active }));
  });
const frames = () =>
  act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

beforeEach(() => {
  bridge.available = true;
  bridge.swipeBackSettled.mockClear();
  bridge.pathname = '/photos/1';
});

it('스와이프로 화면이 바뀌면 그린 뒤 쉘에 한 번 알린다', async () => {
  const { rerender } = renderHook(() => useSwipeBackSettled());
  swipe(true);
  bridge.pathname = '/photos';
  rerender();
  await frames();
  expect(bridge.swipeBackSettled).toHaveBeenCalledTimes(1);

  // 그 뒤 일반 이동에는 알리지 않음
  bridge.pathname = '/feed';
  rerender();
  await frames();
  expect(bridge.swipeBackSettled).toHaveBeenCalledTimes(1);
});

it('스와이프가 이동 없이 끝났거나 이전 쉘이면 알리지 않는다', async () => {
  const { rerender } = renderHook(() => useSwipeBackSettled());
  swipe(true);
  swipe(false);
  bridge.pathname = '/photos';
  rerender();
  await frames();
  expect(bridge.swipeBackSettled).not.toHaveBeenCalled();

  bridge.available = false;
  swipe(true);
  bridge.pathname = '/feed';
  rerender();
  await frames();
  expect(bridge.swipeBackSettled).not.toHaveBeenCalled();
});

it('보이는 사진이 다 그려진 뒤에 알린다', async () => {
  let decoded: () => void = () => {};
  const image = document.createElement('img');
  image.src = 'https://example.com/a.jpg';
  image.decode = () => new Promise<void>((resolve) => (decoded = resolve));
  image.getBoundingClientRect = () => ({ top: 10, bottom: 100, left: 0, right: 100 }) as DOMRect;
  document.body.append(image);

  const { rerender } = renderHook(() => useSwipeBackSettled());
  swipe(true);
  bridge.pathname = '/photos';
  rerender();
  await frames();
  expect(bridge.swipeBackSettled).not.toHaveBeenCalled();

  await act(async () => {
    decoded();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(bridge.swipeBackSettled).toHaveBeenCalledTimes(1);
  image.remove();
});
