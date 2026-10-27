import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
