import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuDivider } from '../menuDivider';
import { MenuItem } from '../menuItem';
import { Menu } from './Menu';

const renderMenu = () =>
  render(
    <Menu aria-label="번들 메뉴">
      <MenuItem>저장</MenuItem>
      <MenuItem>날짜 바꾸기</MenuItem>
      <MenuDivider />
      <MenuItem tone="warning">삭제</MenuItem>
    </Menu>,
  );

describe('Menu', () => {
  it('role=menu와 접근성 이름을 가진다', () => {
    renderMenu();
    expect(screen.getByRole('menu', { name: '번들 메뉴' })).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('방향키로 항목 포커스를 순환한다', () => {
    renderMenu();
    const [a, b, c] = screen.getAllByRole('menuitem');
    a?.focus();
    fireEvent.keyDown(a as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(b);
    fireEvent.keyDown(b as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(a);
  });

  it('Home·End로 처음·끝 항목으로 이동한다', () => {
    renderMenu();
    const [a, , c] = screen.getAllByRole('menuitem');
    a?.focus();
    fireEvent.keyDown(a as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(a);
  });

  it('MenuDivider를 넣은 위치에만 separator가 생긴다', () => {
    renderMenu();
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    const children = [...screen.getByRole('menu').children];
    expect(children.map((el) => el.getAttribute('role'))).toEqual([
      'menuitem',
      'menuitem',
      'separator',
      'menuitem',
    ]);
  });

  it('MenuDivider가 없으면 구분선이 없다', () => {
    render(
      <Menu aria-label="m">
        <MenuItem>저장</MenuItem>
        <MenuItem>삭제</MenuItem>
      </Menu>,
    );
    expect(screen.queryByRole('separator')).toBeNull();
  });
});

describe('Menu 포커스', () => {
  it('메뉴 자체에 포커스가 있으면 ArrowDown은 첫 항목, ArrowUp은 끝 항목으로 간다', () => {
    renderMenu();
    const menu = screen.getByRole('menu');
    const items = screen.getAllByRole('menuitem');
    menu.focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    menu.focus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[2]);
  });

  it('호출자 onKeyDown이 preventDefault하면 이동하지 않는다', () => {
    render(
      <Menu aria-label="m" onKeyDown={(event) => event.preventDefault()}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    const menu = screen.getByRole('menu');
    menu.focus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(menu);
  });

  it('구분선은 방향키 이동에서 건너뛴다', () => {
    renderMenu();
    const [, b, c] = screen.getAllByRole('menuitem');
    b?.focus();
    fireEvent.keyDown(b as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(c);
  });
});

describe('Menu 모션', () => {
  it('기본은 열린 상태(data-state=open)이고 inert가 아니다', () => {
    renderMenu();
    const menu = screen.getByRole('menu');
    expect(menu.getAttribute('data-state')).toBe('open');
    expect(menu.hasAttribute('inert')).toBe(false);
  });

  it('open=false면 닫히는 상태이고 포커스·읽기 대상에서 빠진다', () => {
    render(
      <Menu aria-label="m" open={false}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    const menu = document.querySelector('[data-state="closed"]') as HTMLElement;
    expect(menu).toBeTruthy();
    expect(menu.hasAttribute('inert')).toBe(true);
  });

  it('닫히는 모션이 끝나면 onExited를 한 번 부른다', () => {
    const onExited = vi.fn();
    render(
      <Menu aria-label="m" open={false} onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    const menu = document.querySelector('[data-state="closed"]') as HTMLElement;
    fireEvent.animationEnd(menu);
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('열려 있을 때 끝난 모션(나타나는 모션)은 onExited를 부르지 않는다', () => {
    const onExited = vi.fn();
    render(
      <Menu aria-label="m" onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    fireEvent.animationEnd(screen.getByRole('menu'));
    expect(onExited).not.toHaveBeenCalled();
  });

  it('안쪽 요소의 모션 끝은 onExited로 새지 않는다', () => {
    const onExited = vi.fn();
    render(
      <Menu aria-label="m" open={false} onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    fireEvent.animationEnd(document.querySelector('[role="menuitem"]') as HTMLElement);
    expect(onExited).not.toHaveBeenCalled();
  });

  it('호출자의 onAnimationEnd도 함께 불린다', () => {
    const onAnimationEnd = vi.fn();
    render(
      <Menu aria-label="m" onAnimationEnd={onAnimationEnd}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    fireEvent.animationEnd(screen.getByRole('menu'));
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
  });
});

describe('Menu 닫힘 안전장치', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('모션 끝 이벤트가 오지 않아도 500ms 뒤 onExited를 부른다', () => {
    const onExited = vi.fn();
    render(
      <Menu aria-label="m" open={false} onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onExited).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('모션 끝 이벤트로 이미 불렀으면 타이머가 다시 부르지 않는다', () => {
    const onExited = vi.fn();
    render(
      <Menu aria-label="m" open={false} onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    fireEvent.animationEnd(document.querySelector('[data-state="closed"]') as HTMLElement);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('열려 있으면 타이머가 있어도 onExited를 부르지 않는다', () => {
    const onExited = vi.fn();
    render(
      <Menu aria-label="m" onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onExited).not.toHaveBeenCalled();
  });

  it('닫는 도중 다시 열면 onExited를 부르지 않고, 다시 닫으면 한 번 더 부른다', () => {
    const onExited = vi.fn();
    const { rerender } = render(
      <Menu aria-label="m" open={false} onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender(
      <Menu aria-label="m" open onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onExited).not.toHaveBeenCalled();

    rerender(
      <Menu aria-label="m" open={false} onExited={onExited}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('렌더마다 onExited가 새 함수여도 안전장치가 최신 함수를 부른다', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Menu aria-label="m" open={false} onExited={first}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    rerender(
      <Menu aria-label="m" open={false} onExited={second}>
        <MenuItem>저장</MenuItem>
      </Menu>,
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
