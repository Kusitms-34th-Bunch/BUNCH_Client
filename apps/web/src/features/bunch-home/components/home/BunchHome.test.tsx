import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { BunchHome } from './BunchHome';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()` 담당이라 호출 인자만 확인
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

beforeEach(() => {
  push.mockClear();
  toast.mockClear();
});

// 가짜 서버의 기본 번치는 여행쥬아(비공개, TYPE_1, 멤버 5명)
const renderHome = async () => {
  const result = render(<BunchHome />, { wrapper: createQueryWrapper(createTestQueryClient()) });
  await screen.findByRole('heading', { level: 1, name: /여행쥬아/ });
  return result;
};

const openSwitcher = async (user: ReturnType<typeof userEvent.setup>, name = /여행쥬아/) => {
  await user.click(screen.getByRole('button', { name }));
  return screen.findByRole('dialog', { name: '번치 전환하기' });
};

describe('BunchHome', () => {
  it('번치 이름이 페이지 제목이고 팔로워·팔로잉 수는 내 번치의 목록 링크, 첫 탭은 완성된 번들이다', async () => {
    await renderHome();

    expect(screen.getByText('비공개 번치')).toBeTruthy();
    // 팔로워·팔로잉 수는 가짜 DB의 팔로우 관계(팔로워 3·팔로잉 2)
    expect(screen.getByText('팔로워').previousSibling?.textContent).toBe('3');
    expect(screen.getByRole('link', { name: '3 팔로워' }).getAttribute('href')).toBe(
      '/bunch/follows',
    );
    expect(screen.getByRole('link', { name: '2 팔로잉' }).getAttribute('href')).toBe(
      '/bunch/follows?tab=following',
    );
    expect(screen.getByRole('tab', { name: '완성된 번들' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('번치 성격에 따라 헤더·위쪽 Safe Area 배경이 바뀌고, 전환 목록은 지금 번치를 표시한다', async () => {
    const user = userEvent.setup();
    const { container } = await renderHome();
    const background = () => ({
      app: container.querySelector('[data-app-background]')?.getAttribute('data-app-background'),
      header: container.querySelector('header')?.className,
    });

    // 여행쥬아 TYPE_1 연보라
    expect(background().app).toBe('brand-subtle-1');
    expect(background().header).toContain('bg-surface-brand-subtle-1');

    const sheet = await openSwitcher(user);
    expect(
      within(sheet)
        .getByRole('button', { name: /여행쥬아/ })
        .getAttribute('aria-current'),
    ).toBe('true');
    await user.click(await within(sheet).findByRole('button', { name: /퇴근런클럽/ }));

    // 퇴근런클럽 TYPE_2 주황
    await screen.findByRole('heading', { level: 1, name: /퇴근런클럽/ });
    expect(background().app).toBe('orange-50');
    expect(background().header).toContain('bg-primitive-orange-50');
  });

  it('「새로운 번치 추가하기」는 시트를 닫은 뒤 번치 시작 선택으로 이동한다', async () => {
    const user = userEvent.setup();
    await renderHome();

    const sheet = await openSwitcher(user);
    await user.click(within(sheet).getByRole('button', { name: '새로운 번치 추가하기' }));

    // 시트가 닫힌 뒤 이동
    await waitFor(() => expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.startBunch));
    expect(screen.queryByRole('dialog', { name: '번치 전환하기' })).toBeNull();
  });

  it('접근 불가 안내를 Esc로 닫으면 목록에 남긴다', async () => {
    const user = userEvent.setup();
    await renderHome();

    const sheet = await openSwitcher(user);
    await user.click(await within(sheet).findByRole('button', { name: /큐시즘 맛집/ }));
    await screen.findByRole('alertdialog', { name: '큐시즘 맛집 번치에서 내보내졌어요' });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(within(sheet).getByRole('button', { name: /큐시즘 맛집/ })).toBeTruthy();
  });

  it('「+」는 번들 만들기 화면으로 이동한다', async () => {
    await renderHome();

    await userEvent.click(screen.getByRole('button', { name: '번들 만들기' }));

    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.createBundle);
    expect(BUNCH_HOME_PATHS.createBundle).toBe('/bunch/bundles/new/members');
  });

  it('「콕한 장소」는 콕한 장소 화면으로 이동한다', async () => {
    await renderHome();

    await userEvent.click(screen.getByRole('button', { name: '콕한 장소' }));

    expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.places);
    expect(BUNCH_HOME_PATHS.places).toBe('/bunch/places');
  });

  it('헤더 더보기는 더보기 메뉴로 가는 링크다(새 탭 열기 지원)', async () => {
    await renderHome();

    expect(screen.getByRole('link', { name: '더보기' }).getAttribute('href')).toBe(
      BUNCH_HOME_PATHS.menu,
    );
  });
});
