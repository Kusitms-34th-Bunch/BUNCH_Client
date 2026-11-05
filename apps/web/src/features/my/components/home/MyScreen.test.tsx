import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MyScreen } from './MyScreen';

const renderScreen = () => render(<MyScreen profile={{ nickname: '으누' }} />);

describe('MyScreen', () => {
  it('제목 MY와 내 닉네임을 보여 주고, 프로필 행은 프로필 수정으로 가는 링크다', () => {
    renderScreen();

    expect(screen.getByRole('heading', { level: 1, name: 'MY' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '으누 프로필 수정' }).getAttribute('href')).toBe(
      '/my/profile',
    );
  });

  it('프로필 사진이 있으면 장식 이미지로 보여 준다', () => {
    const { container } = render(
      <MyScreen profile={{ nickname: '으누', imageSrc: 'https://cdn.example/me.jpg' }} />,
    );

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://cdn.example/me.jpg');
    expect(image?.getAttribute('alt')).toBe('');
  });

  it('메뉴를 묶음별로 보여 주고 화면 이동 메뉴는 각 경로로 연결한다', () => {
    renderScreen();

    // 묶음 제목(h2) 바로 다음 목록의 항목
    const items = (title: string) =>
      within(
        screen.getByRole('heading', { level: 2, name: title }).nextElementSibling as HTMLElement,
      )
        .getAllByRole('listitem')
        .map((item) => item.textContent);
    expect(items('알림')).toEqual(['알림 설정']);
    expect(items('약관 및 정책')).toEqual(['서비스 이용약관', '개인정보 처리방침']);
    expect(items('고객지원')).toEqual(['문의하기', '로그아웃', '탈퇴하기']);

    const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('알림 설정')).toBe('/my/notifications');
    expect(href('서비스 이용약관')).toBe('/my/terms/service');
    expect(href('개인정보 처리방침')).toBe('/my/terms/privacy');
    expect(href('탈퇴하기')).toBe('/my/withdrawal');
  });

  it('문의하기·로그아웃은 화면 이동이 아닌 버튼이다', () => {
    renderScreen();

    expect(screen.getByRole('button', { name: '문의하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
  });
});
