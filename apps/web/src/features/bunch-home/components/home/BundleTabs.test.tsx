import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BundleTabs } from './BundleTabs';

const renderTabs = (bunchId = 'bunch-1') =>
  render(
    <BundleTabs
      bunchId={bunchId}
      completedBundles={[]}
      draftBundles={[]}
      onDeleteDraft={vi.fn()}
    />,
  );

describe('BundleTabs 탭 유지', () => {
  it('고른 탭은 같은 기록 항목으로 돌아와 다시 그려도 유지한다', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTabs();
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    unmount();

    // 작성 중인 번들에 들어갔다가 뒤로 돌아온 경우(같은 기록 항목에서 다시 마운트)
    renderTabs();
    expect(screen.getByRole('tab', { name: '작성 중인 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('다른 번치로 다시 그리면 적어 둔 탭을 쓰지 않고 처음 탭부터 보인다', async () => {
    const user = userEvent.setup();
    const { unmount } = renderTabs('bunch-1');
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    unmount();

    renderTabs('bunch-2');
    expect(screen.getByRole('tab', { name: '완성된 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('다른 번치로 전환했다가 돌아오면 앞서 고른 탭이 아니라 처음 탭부터 보인다', async () => {
    const user = userEvent.setup();
    const first = renderTabs('bunch-1');
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    first.unmount();
    // 번치 전환: 같은 기록 항목에서 다른 번치로 다시 그림
    renderTabs('bunch-2').unmount();

    renderTabs('bunch-1');
    expect(screen.getByRole('tab', { name: '완성된 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

const stubAnimate = () => {
  const calls: { element: Element; keyframes: Keyframe[] }[] = [];
  // happy-dom에는 Web Animations가 없어 테스트 동안만 둠
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    value: vi.fn(function (this: Element, keyframes: Keyframe[]) {
      calls.push({ element: this, keyframes });
      return { cancel: vi.fn(), finished: Promise.resolve() } as unknown as Animation;
    }),
    configurable: true,
    writable: true,
  });
  return calls;
};

describe('BundleTabs 탭 전환 밀기', () => {
  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    vi.unstubAllGlobals();
  });

  it('처음 그릴 때는 밀지 않고, 오른쪽 탭으로 가면 새 패널은 오른쪽에서 들어오고 나가는 패널은 왼쪽으로 빠진다', async () => {
    const calls = stubAnimate();
    const user = userEvent.setup();
    renderTabs('bunch-slide');
    expect(calls).toHaveLength(0);
    const before = screen.getByRole('tabpanel');
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));

    const incoming = calls.find(({ keyframes }) => keyframes[0]?.transform === 'translateX(100%)');
    const outgoing = calls.find(({ keyframes }) => keyframes[1]?.transform === 'translateX(-100%)');
    expect(incoming?.element).toHaveTextContent('아직 작성 중인 번들이 없어요');
    expect(outgoing?.element).toBe(before);
  });

  it('왼쪽 탭으로 가면 새 패널이 왼쪽에서 들어온다', async () => {
    const calls = stubAnimate();
    const user = userEvent.setup();
    renderTabs('bunch-slide-back');
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    calls.length = 0;
    await user.click(screen.getByRole('tab', { name: '완성된 번들' }));

    const incoming = calls.find(({ keyframes }) => keyframes[0]?.transform === 'translateX(-100%)');
    expect(incoming?.element).toHaveTextContent('추억은 많은데');
  });

  it('동작 줄이기면 밀지 않고 바로 바뀐다', async () => {
    const calls = stubAnimate();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
    }));
    const user = userEvent.setup();
    renderTabs('bunch-slide-reduce');
    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));

    expect(calls).toHaveLength(0);
    expect(screen.getByRole('tab', { name: '작성 중인 번들' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
