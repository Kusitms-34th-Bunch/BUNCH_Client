import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { SuggestedBundleCard, type SuggestedBundleCardProps } from './SuggestedBundleCard';

const BASE: SuggestedBundleCardProps = {
  imageSrc: 'photo.png',
  title: '성수동 러닝 모임',
  members: ['지예', '경진', '수인'],
  photoCount: 8,
  month: 8,
  day: 28,
};

const renderCard = (props?: Partial<SuggestedBundleCardProps>) =>
  render(<SuggestedBundleCard {...BASE} {...props} />);

describe('SuggestedBundleCard', () => {
  it('번들 이름·멤버·사진 수·날짜를 보여 준다', () => {
    renderCard();

    expect(screen.getByRole('button', { name: '성수동 러닝 모임' })).toBeTruthy();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '지예',
      '경진',
      '수인',
    ]);
    expect(screen.getByText('8장')).toBeTruthy();
    expect(screen.getByText('8월 28일')).toBeTruthy();
  });

  it('대표 사진은 기본으로 장식이고 imageAlt를 주면 이름을 갖는다', () => {
    const { container, rerender } = renderCard();

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('photo.png');

    rerender(<SuggestedBundleCard {...BASE} imageAlt="한강 러닝" />);

    expect(screen.getByRole('img', { name: '한강 러닝' })).toBeTruthy();
  });

  it('멤버가 maxVisibleMembers를 넘으면 마지막 칩이 마지막 멤버 외 N명이 된다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] });

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f 외 2명',
    ]);
  });

  it('maxVisibleMembers를 바꾸면 그 수만큼만 칩으로 보인다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd'], maxVisibleMembers: 2 });

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'a',
      'b 외 2명',
    ]);
  });

  it('멤버가 딱 maxVisibleMembers면 외 N명 칩이 없다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd', 'e', 'f'] });

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.queryByText(/ 외 /)).toBeNull();
  });

  it('멤버가 없으면 멤버 목록을 그리지 않는다', () => {
    renderCard({ members: [] });

    expect(screen.queryByRole('list')).toBeNull();
  });

  it('maxVisibleMembers가 숫자가 아니면 기본 6칩으로 본다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], maxVisibleMembers: Number.NaN });

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
  });

  it('maxVisibleMembers가 소수면 내림해서 외 N명이 정수로 나온다', () => {
    renderCard({ members: ['a', 'b', 'c', 'd'], maxVisibleMembers: 2.5 });

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'a',
      'b 외 2명',
    ]);
  });

  it('selected가 아니면 aria-pressed가 false이고 칩은 gray다', () => {
    renderCard();

    expect(
      screen.getByRole('button', { name: '성수동 러닝 모임' }).getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.getByText('지예').className).toContain('bg-surface-secondary');
  });

  it('selected면 aria-pressed가 true이고 칩과 글자가 brand다', () => {
    renderCard({ selected: true });
    const card = screen.getByRole('button', { name: '성수동 러닝 모임' });

    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(card.className).toContain('text-text-brand');
    expect(screen.getByText('지예').className).toContain('bg-surface-brand-subtle-1');
  });

  it('카드를 누르면 onCardClick, 화살표를 누르면 onDetailClick만 호출된다', () => {
    const onCardClick = vi.fn();
    const onDetailClick = vi.fn();
    renderCard({ onCardClick, onDetailClick });

    fireEvent.click(screen.getByRole('button', { name: '성수동 러닝 모임' }));

    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onDetailClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '성수동 러닝 모임 상세 보기' }));

    expect(onDetailClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('두 버튼은 form 안에서 제출하지 않고 아이콘은 숨겨진다', () => {
    const { container } = renderCard();

    for (const button of screen.getAllByRole('button')) {
      expect(button.getAttribute('type')).toBe('button');
    }
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('연도와 끝 날짜가 있으면 날짜에 붙고, 월이 같으면 끝 날짜의 월은 생략한다', () => {
    const { rerender } = renderCard({ year: 2025, month: 10, day: 19, endMonth: 10, endDay: 20 });
    expect(screen.getByText('2025년 10월 19일~20일')).toBeTruthy();

    rerender(<SuggestedBundleCard {...BASE} month={10} day={31} endMonth={11} endDay={1} />);
    expect(screen.getByText('10월 31일~11월 1일')).toBeTruthy();

    rerender(<SuggestedBundleCard {...BASE} month={10} day={19} endDay={20} />);
    expect(screen.getByText('10월 19일~20일')).toBeTruthy();
  });

  describe('칩 줄 너비', () => {
    // 칩 하나의 너비는 글자 수 × 10px로, 칩 줄의 너비는 지정한 값으로 흉내 냄
    let listWidth = 0;
    let observe: (() => void) | undefined;
    const original = {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- 원래 메서드를 보관했다가 되돌리는 용도
      rect: HTMLElement.prototype.getBoundingClientRect,
      clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
      observer: globalThis.ResizeObserver,
    };

    beforeEach(() => {
      HTMLElement.prototype.getBoundingClientRect = function getRect() {
        // 측정용 칩은 글자를 data-text에 두므로 그 길이로 잼
        const text =
          this.querySelector('[data-text]')?.getAttribute('data-text') ?? this.textContent ?? '';
        const width = text.length * 10;
        return {
          width,
          height: 20,
          top: 0,
          left: 0,
          right: width,
          bottom: 20,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      };
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
        configurable: true,
        get() {
          const element = this as unknown as HTMLElement;
          return element.getAttribute('aria-label') === '참여 멤버' ? listWidth : 0;
        },
      });
      globalThis.ResizeObserver = class {
        constructor(callback: () => void) {
          observe = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      HTMLElement.prototype.getBoundingClientRect = original.rect;
      if (original.clientWidth)
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', original.clientWidth);
      globalThis.ResizeObserver = original.observer;
      observe = undefined;
    });

    // 이름 칩은 30px, 「이름 외 N명」 칩은 80px
    const names = ['가나다', '라마바', '사아자', '차카타'];
    const five = [...names, '파하퍄'];
    const chips = () => screen.getAllByRole('listitem').map((item) => item.textContent);

    it('한 줄에 다 안 들어가면 「외 N명」 칩이 들어갈 자리까지 계산해 칩 수를 줄인다', () => {
      // 5개: 150, 4개: 90 + 80 = 170, 3개: 60 + 80 = 140 이라 3개까지 들어감
      listWidth = 145;
      renderCard({ members: five, maxVisibleMembers: 10 });

      expect(chips()).toEqual(['가나다', '라마바', '사아자 외 2명']);
    });

    it('줄이 더 좁으면 더 줄인다', () => {
      // 4개: 120, 3개: 60 + 80 = 140, 2개: 30 + 80 = 110 이라 2개까지 들어감
      listWidth = 119;
      renderCard({ members: names, maxVisibleMembers: 10 });

      expect(chips()).toEqual(['가나다', '라마바 외 2명']);
    });

    it('하나도 안 들어가도 한 칩은 보인다', () => {
      listWidth = 20;
      renderCard({ members: names, maxVisibleMembers: 10 });

      expect(chips()).toEqual(['가나다 외 3명']);
    });

    it('넉넉하면 상한(maxVisibleMembers)까지만 보인다', () => {
      listWidth = 1000;
      renderCard({ members: names, maxVisibleMembers: 2 });

      expect(chips()).toEqual(['가나다', '라마바 외 2명']);
    });

    it('카드 너비가 바뀌면 칩 수를 다시 잰다', () => {
      listWidth = 1000;
      renderCard({ members: names, maxVisibleMembers: 10 });
      expect(chips()).toEqual(names);

      listWidth = 119;
      act(() => observe?.());

      expect(chips()).toEqual(['가나다', '라마바 외 2명']);
    });

    it('너비를 잴 수 없으면(0) 상한만 따른다', () => {
      listWidth = 0;
      renderCard({ members: names, maxVisibleMembers: 3 });

      expect(chips()).toEqual(['가나다', '라마바', '사아자 외 1명']);
    });
  });

  it('기간은 화면에는 물결표로 보이고 스크린 리더에는 「부터 ~까지」로 읽힌다', () => {
    renderCard({ year: 2025, month: 10, day: 19, endMonth: 10, endDay: 20 });

    expect(screen.getByText('2025년 10월 19일~20일').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('2025년 10월 19일부터 20일까지').className).toContain('sr-only');
  });

  it('월이 다른 기간은 끝 날짜에 월을 붙여 읽고, 하루짜리는 읽기용 문구를 따로 두지 않는다', () => {
    const { rerender } = renderCard({ month: 10, day: 31, endMonth: 11, endDay: 1 });
    expect(screen.getByText('10월 31일부터 11월 1일까지')).toBeTruthy();

    rerender(<SuggestedBundleCard {...BASE} month={10} day={19} />);
    expect(screen.getByText('10월 19일').getAttribute('aria-hidden')).toBeNull();
    expect(screen.queryByText(/부터/)).toBeNull();
  });

  it('className과 div 속성이 카드에 합쳐진다', () => {
    renderCard({ className: 'mt-2', 'data-testid': 'card' } as Partial<SuggestedBundleCardProps>);

    expect(screen.getByTestId('card').className).toContain('mt-2');
  });
});
