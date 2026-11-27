import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LineAlertMediumIcon } from '../../../icons';
import { SideMenu } from './SideMenu';

afterEach(cleanup);

describe('SideMenu', () => {
  it('이름과 건수가 링크의 접근성 이름이다', () => {
    render(
      <SideMenu icon={<LineAlertMediumIcon />} href="/reports" count={12}>
        신고 조회 및 처리
      </SideMenu>,
    );

    const link = screen.getByRole('link', { name: '신고 조회 및 처리 12' });
    expect(link.getAttribute('href')).toBe('/reports');
  });

  it('건수가 없으면 배지를 숨긴다', () => {
    render(
      <SideMenu icon={<LineAlertMediumIcon />} href="/members">
        회원 조회 및 정지
      </SideMenu>,
    );

    expect(screen.getByRole('link', { name: '회원 조회 및 정지' })).toBeTruthy();
  });

  it('현재 화면이면 aria-current="page"로 알린다', () => {
    render(
      <>
        <SideMenu icon={<LineAlertMediumIcon />} href="/reports" selected>
          신고 조회 및 처리
        </SideMenu>
        <SideMenu icon={<LineAlertMediumIcon />} href="/members">
          회원 조회 및 정지
        </SideMenu>
      </>,
    );

    expect(
      screen.getByRole('link', { name: '신고 조회 및 처리' }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: '회원 조회 및 정지' }).hasAttribute('aria-current'),
    ).toBe(false);
  });

  it('renderLink가 있으면 호출자의 링크 요소로 그린다', () => {
    render(
      <SideMenu
        icon={<LineAlertMediumIcon />}
        selected
        renderLink={({ children, ...state }) => (
          <a {...state} href="/spots" data-router-link="">
            {children}
          </a>
        )}
      >
        번치 스팟 관리
      </SideMenu>,
    );

    const link = screen.getByRole('link', { name: '번치 스팟 관리' });
    expect(link.hasAttribute('data-router-link')).toBe(true);
    expect(link.getAttribute('aria-current')).toBe('page');
  });
});
