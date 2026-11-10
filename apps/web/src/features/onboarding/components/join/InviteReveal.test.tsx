import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INVITE_REVEAL_CARD_READY,
  INVITE_REVEAL_COLORS,
  INVITE_REVEAL_DURATION_MS,
  INVITE_REVEAL_GLINTS,
} from '../../constants/inviteReveal';
import { InviteReveal } from './InviteReveal';

const cancel = vi.fn();
const animate = vi.fn(() => ({ cancel }));

const mockReducedMotion = (reduce: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduce })),
  );

const renderReveal = (characterType: 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4' = 'TYPE_1') =>
  render(
    <InviteReveal characterType={characterType} title={<h1>초대받은 번치에 참여할까요?</h1>}>
      <button type="button">참여하기</button>
    </InviteReveal>,
  );

// 제목 2 + 카드 2 + 봉투 3 + 인장 1 + 조각(사라짐 + 움직이는 조각의 이동)
const MOVING_GLINTS = INVITE_REVEAL_GLINTS.filter((glint) => glint.dx !== 0 || glint.dy !== 0);
const ANIMATION_COUNT = 8 + INVITE_REVEAL_GLINTS.length + MOVING_GLINTS.length;

describe('InviteReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    animate.mockClear();
    cancel.mockClear();
    Element.prototype.animate = animate as unknown as Element['animate'];
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    // @ts-expect-error 테스트에서 붙인 animate 제거
    delete Element.prototype.animate;
  });

  it('제목·카드·봉투·인장·조각을 4.2초 타임라인으로 재생한다', () => {
    renderReveal();

    expect(animate).toHaveBeenCalledTimes(ANIMATION_COUNT);
    for (const [, options] of animate.mock.calls as unknown as [
      unknown,
      KeyframeAnimationOptions,
    ][]) {
      expect(options.duration).toBe(INVITE_REVEAL_DURATION_MS);
    }
  });

  it('카드는 펼쳐지는 시각까지 inert이고 이후 풀린다', () => {
    const { container } = renderReveal();
    const cardWrapper = container.querySelector('button')?.parentElement;

    expect(cardWrapper?.hasAttribute('inert')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(INVITE_REVEAL_DURATION_MS * INVITE_REVEAL_CARD_READY);
    });

    expect(cardWrapper?.hasAttribute('inert')).toBe(false);
  });

  it('봉투와 인장은 장식이라 숨기고 번치 타입에 맞는 색을 쓴다', () => {
    for (const type of ['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4'] as const) {
      const { container, unmount } = renderReveal(type);
      const envelope = container.querySelector('[aria-hidden="true"]') as HTMLElement;

      expect(envelope).toBeTruthy();
      expect(envelope.style.backgroundColor).not.toBe('');
      expect(envelope.querySelectorAll('span')).toHaveLength(1 + INVITE_REVEAL_GLINTS.length);
      expect(INVITE_REVEAL_COLORS[type]).toMatch(/^#/);
      unmount();
    }
  });

  it('화면이 사라지면 재생을 취소한다', () => {
    const { unmount } = renderReveal();

    unmount();

    expect(cancel).toHaveBeenCalledTimes(ANIMATION_COUNT);
  });

  it('움직임 줄이기 설정이면 봉투 없이 최종 화면을 바로 보여 준다', () => {
    mockReducedMotion(true);

    const { container } = renderReveal();

    expect(animate).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(container.querySelector('[inert]')).toBeNull();
    expect(screen.getByRole('heading', { name: '초대받은 번치에 참여할까요?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '참여하기' })).toBeTruthy();
  });

  it('재생을 지원하지 않는 환경도 최종 화면을 바로 보여 준다', () => {
    // @ts-expect-error 재생 미지원 환경을 흉내
    delete Element.prototype.animate;

    const { container } = renderReveal();

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(container.querySelector('[inert]')).toBeNull();
  });
});
