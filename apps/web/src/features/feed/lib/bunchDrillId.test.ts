import { afterEach, describe, expect, it, vi } from 'vitest';
import { leaveToBunch, returnFromBunch } from './bunchDrillId';

const ATTR = 'data-ssgoi-transition';
const page = () => {
  const element = document.createElement('div');
  element.setAttribute(ATTR, '/bundles/detail');
  document.body.append(element);
  return element;
};

describe('번치 drill 전환 id', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState(null, '');
    vi.useRealTimers();
  });

  it('떠날 때 drill id로 바꾸고 기록에 표시하며, 화면에 남은 채 입력이 오면 되돌리고 표시를 지운다', () => {
    const element = page();
    leaveToBunch(element);
    expect(element.getAttribute(ATTR)).toBe('/bundles/detail/to-bunch');
    expect(window.history.state).toMatchObject({ leftToBunch: true });
    window.dispatchEvent(new Event('pointerdown'));
    expect(element.getAttribute(ATTR)).toBe('/bundles/detail');
    expect(window.history.state).not.toHaveProperty('leftToBunch');
  });

  it('표시된 항목으로 돌아오면 drill id로 그리고, 나가는 화면이 사라진 뒤 되돌린다', () => {
    vi.useFakeTimers();
    window.history.replaceState({ leftToBunch: true }, '');
    const leaving = document.createElement('div');
    leaving.dataset.pageLeaving = '';
    document.body.append(leaving);
    const element = page();
    returnFromBunch(element);
    expect(element.getAttribute(ATTR)).toBe('/bundles/detail/to-bunch');
    vi.advanceTimersByTime(100);
    expect(element.getAttribute(ATTR)).toBe('/bundles/detail/to-bunch');
    leaving.remove();
    vi.advanceTimersByTime(100);
    expect(element.getAttribute(ATTR)).toBe('/bundles/detail');
    expect(window.history.state).not.toHaveProperty('leftToBunch');
  });

  it('표시가 없으면 id를 바꾸지 않는다', () => {
    const element = page();
    returnFromBunch(element);
    expect(element.getAttribute(ATTR)).toBe('/bundles/detail');
  });
});
