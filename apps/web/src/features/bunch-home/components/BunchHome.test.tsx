import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_PATHS } from '../constants/paths';
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

beforeEach(() => {
  // 지금 번치는 sessionStorage에 유지되므로 테스트마다 기본 번치로
  sessionStorage.clear();
  push.mockClear();
  toast.mockClear();
});

const openSwitcher = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /여행가조/ }));
  return screen.findByRole('dialog', { name: '번치 전환하기' });
};

describe('BunchHome', () => {
  it('번치 이름이 페이지 제목이고 팔로워·팔로잉·멤버 수와 완성된 번들 그리드를 보여 준다', () => {
    render(<BunchHome />);

    expect(screen.getByRole('heading', { level: 1, name: '여행가조' })).toBeTruthy();
    expect(screen.getByText('팔로워').previousSibling?.textContent).toBe('23');
    // 팔로워·팔로잉 수는 내 번치의 목록으로(누른 쪽 탭)
    expect(screen.getByRole('link', { name: '23 팔로워' }).getAttribute('href')).toBe(
      '/bunch/follows',
    );
    expect(screen.getByRole('link', { name: '8 팔로잉' }).getAttribute('href')).toBe(
      '/bunch/follows?tab=following',
    );
    expect(screen.getByRole('tab', { name: '완성된 번들' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getAllByRole('img', { name: /완성된 번들 \d/ })).toHaveLength(7);
  });

  it('작성 중인 번들 탭에서 삭제를 확인하면 카드가 사라진다', async () => {
    const user = userEvent.setup();
    render(<BunchHome />);

    await user.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    await user.click(screen.getByRole('button', { name: '머그샷 삭제' }));
    const dialog = await screen.findByRole('alertdialog', { name: '작성 중인 번들을 삭제할까요?' });
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: '머그샷 삭제' })).toBeNull());
    expect(screen.getByRole('button', { name: '부자가되고싶어요 삭제' })).toBeTruthy();
  });

  it('전환 시트에서 다른 번치를 고르면 화면이 바뀌고 토스트로 알린다', async () => {
    const user = userEvent.setup();
    render(<BunchHome />);

    const sheet = await openSwitcher(user);
    expect(
      within(sheet)
        .getByRole('button', { name: /여행가조/ })
        .getAttribute('aria-current'),
    ).toBe('true');
    await user.click(within(sheet).getByRole('button', { name: /퇴근런클럽/ }));

    expect(screen.getByRole('heading', { level: 1, name: '퇴근런클럽' })).toBeTruthy();
    expect(screen.getByText('비공개 번치')).toBeTruthy();
    expect(screen.getByRole('button', { name: '첫 번들 만들기' })).toBeTruthy();
    expect(toast).toHaveBeenCalledWith('퇴근런클럽 번치로 전환했어요.', expect.anything());
  });

  it('「새로운 번치 추가하기」는 시트를 닫은 뒤 번치 시작 선택으로 이동한다', async () => {
    const user = userEvent.setup();
    render(<BunchHome />);

    const sheet = await openSwitcher(user);
    await user.click(within(sheet).getByRole('button', { name: '새로운 번치 추가하기' }));

    // 시트가 닫힌 뒤 이동
    await waitFor(() => expect(push).toHaveBeenCalledWith(BUNCH_HOME_PATHS.startBunch));
    expect(screen.queryByRole('dialog', { name: '번치 전환하기' })).toBeNull();
  });

  it('전환 목록에서 지금 번치가 맨 위에 있다', async () => {
    const user = userEvent.setup();
    render(<BunchHome />);

    const sheet = await openSwitcher(user);
    const rows = within(sheet).getAllByRole('button', { name: /,|여행가조|퇴근런클럽/ });
    expect(rows[0]?.getAttribute('aria-current')).toBe('true');
  });

  it('접근 불가 번치를 누르면 전환하지 않고 안내를 띄우며, 「번치 목록에서 삭제」로 목록에서 지운다', async () => {
    const user = userEvent.setup();
    render(<BunchHome />);

    const sheet = await openSwitcher(user);
    await user.click(within(sheet).getByRole('button', { name: /홍대 먹짱/ }));
    const dialog = await screen.findByRole('alertdialog', { name: '홍대 먹짱 번치가 삭제됐어요' });
    await user.click(within(dialog).getByRole('button', { name: '번치 목록에서 삭제' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    // 시트가 열려 있어 뒤 화면은 접근성 트리에서 숨김 상태
    expect(screen.getByRole('heading', { level: 1, name: '여행가조', hidden: true })).toBeTruthy();
    expect(within(sheet).queryByRole('button', { name: /홍대 먹짱/ })).toBeNull();
  });

  it('안내를 Esc로 닫으면 목록에 남긴다', async () => {
    const user = userEvent.setup();
    render(<BunchHome />);

    const sheet = await openSwitcher(user);
    await user.click(within(sheet).getByRole('button', { name: /큐시즘 밋업/ }));
    await screen.findByRole('alertdialog', { name: '큐시즘 밋업 번치에서 내보내졌어요' });
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(within(sheet).getByRole('button', { name: /큐시즘 밋업/ })).toBeTruthy();
  });
  it('헤더 더보기는 더보기 메뉴로 가는 링크다(새 탭 열기 지원)', () => {
    render(<BunchHome />);

    expect(screen.getByRole('link', { name: '더보기' }).getAttribute('href')).toBe(
      BUNCH_HOME_PATHS.menu,
    );
  });
});
