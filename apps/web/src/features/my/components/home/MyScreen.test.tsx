import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { openExternal, reloadTo } from '../../lib/navigation';
import { MyScreen } from './MyScreen';

vi.mock('../../lib/navigation', () => ({ openExternal: vi.fn(), reloadTo: vi.fn() }));
// 토스트 표시는 DS의 `toast()` 담당이라 호출만 차단
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(openExternal).mockClear();
  vi.mocked(reloadTo).mockClear();
  vi.mocked(toast).mockClear();
});

const CONTACT_URL = 'https://open.kakao.example/o/channel';

const renderScreen = (contactUrl?: string) =>
  render(<MyScreen profile={{ nickname: '으누' }} contactUrl={contactUrl} />, {
    wrapper: createQueryWrapper(),
  });

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
      { wrapper: createQueryWrapper() },
    );

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toBe('https://cdn.example/me.jpg');
    expect(image?.getAttribute('alt')).toBe('');
  });

  it('메뉴를 묶음별로 보여 주고 화면 이동 메뉴는 각 경로로 연결한다', () => {
    renderScreen(CONTACT_URL);

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
    renderScreen(CONTACT_URL);

    expect(screen.getByRole('button', { name: '문의하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeTruthy();
  });

  it('문의하기는 카카오톡 상담 채널로 간다는 확인 창을 열고 「열기」로 채널을 연다', async () => {
    renderScreen(CONTACT_URL);

    await userEvent.click(screen.getByRole('button', { name: '문의하기' }));
    const dialog = await screen.findByRole('alertdialog', { name: "'카카오톡'에서 열기" });
    expect(within(dialog).getByText('오픈채팅 상담 채널로 이동해요.')).toBeTruthy();

    await userEvent.click(within(dialog).getByRole('button', { name: '열기' }));

    expect(openExternal).toHaveBeenCalledWith('https://open.kakao.example/o/channel');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('문의 채널 주소가 없으면 「열기」를 막고, 「취소」로 닫는다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '문의하기' }));
    const dialog = await screen.findByRole('alertdialog', { name: "'카카오톡'에서 열기" });
    expect(within(dialog).getByRole('button', { name: '열기' })).toBeDisabled();

    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('로그아웃을 확인하면 세션을 끝내고 로그인 화면으로 문서를 새로 연다', async () => {
    // ky afterResponse hook이 빈 본문 응답을 복제하면 happy-dom 스트림 오류 발생(실제 브라우저는 무관), 본문 있는 200으로 대신
    server.use(http.post('/api/auth/logout', () => HttpResponse.json({})));
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('alertdialog', { name: '로그아웃할까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/login'));
  });

  it('로그아웃 요청이 실패하면 이동하지 않고 확인 창을 닫는다', async () => {
    server.use(http.post('/api/auth/logout', () => fail(500, 'COMMON_500')));
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('alertdialog', { name: '로그아웃할까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(reloadTo).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
    // 창을 연 「로그아웃」 메뉴로 포커스가 돌아옴
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: '로그아웃' })),
    );
  });

  it('로그아웃 요청 중에는 「취소」로 창을 닫지 못한다', async () => {
    let finish: () => void = () => {};
    server.use(
      http.post(
        '/api/auth/logout',
        () => new Promise<Response>((resolve) => (finish = () => resolve(HttpResponse.json({})))),
      ),
    );
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('alertdialog', { name: '로그아웃할까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: '로그아웃' })).toBeDisabled(),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(screen.getByRole('alertdialog', { name: '로그아웃할까요?' })).toBeTruthy();
    finish();
    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/login'));
  });

  it('로그아웃 요청 중 화면이 사라져도 성공하면 로그인 화면으로 간다', async () => {
    let finish: () => void = () => {};
    server.use(
      http.post(
        '/api/auth/logout',
        () => new Promise<Response>((resolve) => (finish = () => resolve(HttpResponse.json({})))),
      ),
    );
    const { unmount } = renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    const dialog = await screen.findByRole('alertdialog', { name: '로그아웃할까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '로그아웃' }));
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: '로그아웃' })).toBeDisabled(),
    );
    unmount();
    finish();

    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/login'));
  });
});
