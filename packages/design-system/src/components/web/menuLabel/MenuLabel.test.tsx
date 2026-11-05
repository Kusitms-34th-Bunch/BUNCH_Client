import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LineTrashcanIcon } from '../../../icons';
import { MenuLabel } from './MenuLabel';

afterEach(cleanup);

describe('MenuLabel', () => {
  it('글자가 버튼 이름이고 화살표는 이름에 섞이지 않는다', () => {
    render(<MenuLabel>신고하기</MenuLabel>);

    const button = screen.getByRole('button', { name: '신고하기' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('누르면 onClick을 부른다', () => {
    const onClick = vi.fn();
    render(<MenuLabel onClick={onClick}>차단하기</MenuLabel>);

    fireEvent.click(screen.getByRole('button', { name: '차단하기' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
  it('renderLink를 주면 같은 모양의 링크로 그린다', () => {
    render(
      <MenuLabel
        renderLink={({ className, children }) => (
          <a href="/bunch/menu/profile" className={className}>
            {children}
          </a>
        )}
      >
        프로필 편집
      </MenuLabel>,
    );

    const link = screen.getByRole('link', { name: '프로필 편집' });
    expect(link.getAttribute('href')).toBe('/bunch/menu/profile');
    expect(link.className).toContain('rounded-r4');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('링크로 그릴 때는 비활성을 함께 줄 수 없다(타입)', () => {
    render(
      <MenuLabel
        // @ts-expect-error 링크에는 비활성이 없어 disabled를 받지 않음
        disabled
        renderLink={({ className, children }) => (
          <a href="/bunch/menu/profile" className={className}>
            {children}
          </a>
        )}
      >
        프로필 편집
      </MenuLabel>,
    );

    expect(screen.getByRole('link', { name: '프로필 편집' })).toBeTruthy();
  });
  it('앞 아이콘은 이름에 섞이지 않고, showChevron이 false면 화살표를 그리지 않는다', () => {
    render(
      <MenuLabel leftIcon={<LineTrashcanIcon />} showChevron={false}>
        번치 삭제
      </MenuLabel>,
    );

    const button = screen.getByRole('button', { name: '번치 삭제' });
    // 앞 아이콘 하나만 남음(화살표 없음), 감싼 요소가 낭독에서 빠짐
    expect(button.querySelectorAll('svg')).toHaveLength(1);
    expect(button.querySelector('svg')?.closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('비활성이면 누를 수 없다', () => {
    const onClick = vi.fn();
    render(
      <MenuLabel disabled onClick={onClick}>
        멤버 관리
      </MenuLabel>,
    );

    const button = screen.getByRole('button', { name: '멤버 관리' });
    fireEvent.click(button);

    expect(button).toHaveProperty('disabled', true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
