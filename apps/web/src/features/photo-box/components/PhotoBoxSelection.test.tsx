import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhotoBoxData, PhotoBoxPhoto, PhotoBoxState } from '../lib/types';
import { PHOTO_BOX_MESSAGES } from '../constants/messages';
import { photoBoxFixture } from '../fixtures/photoBox.fixture';
import { MAX_SELECTION } from '../lib/selection';
import { PhotoBoxScreen } from './PhotoBoxScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
// 토스트 표시는 DS의 `toast()` 담당이라 호출 인자만 확인
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const ready = (data: PhotoBoxData = photoBoxFixture): PhotoBoxState => ({ kind: 'ready', data });
const renderScreen = (state: PhotoBoxState = ready()) =>
  render(<PhotoBoxScreen state={state} currentYear={2026} />);

// 선택 모드에서 사진 칸은 aria-pressed를 가진 버튼이다
const photoButtons = () =>
  screen.queryAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'));

const manyPhotos = (count: number): PhotoBoxData => ({
  ...photoBoxFixture,
  photos: Array.from({ length: count }, (_, index): PhotoBoxPhoto => ({
    id: `bulk-${index}`,
    src: `/bulk-${index}.jpg`,
    alt: `사진 ${index}`,
    takenAt: '2026-09-27T10:00',
    uploadedAt: '2026-10-01T00:00:00',
    uploaderIds: ['eunwoo'],
    status: 'ready',
  })),
});

const menuButton = () => screen.getByRole('button', { name: '메뉴 열기' });

beforeEach(() => {
  toast.mockClear();
});

describe('PhotoBoxScreen 선택 모드', () => {
  it('「선택」을 누르면 「취소」로 바뀌고 「+」는 비활성 「⋯」로 바뀐다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '선택' }));

    expect(screen.getByRole('button', { name: '취소' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '선택' })).toBeNull();
    expect(screen.queryByRole('button', { name: '사진 올리기' })).toBeNull();
    expect(menuButton().hasAttribute('disabled')).toBe(true);
  });

  it('선택 모드에서만 사진이 눌러서 고르는 버튼이고 하단 탭 막대 숨김 표식이 생긴다', async () => {
    const user = userEvent.setup();
    const { container } = renderScreen();
    expect(container.querySelector('[data-hide-main-tab-bar]')).toBeNull();
    expect(photoButtons()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: '선택' }));

    expect(container.querySelector('[data-hide-main-tab-bar]')).not.toBeNull();
    expect(photoButtons().length).toBeGreaterThan(0);
    expect(photoButtons().every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(
      true,
    );
  });

  it('누른 순서대로 번호가 붙고 다시 누르면 해제되어 뒤 번호가 당겨진다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '선택' }));
    const [first, second, third] = photoButtons();

    await user.click(second!);
    await user.click(first!);
    await user.click(third!);

    expect(second!.textContent).toContain('1번째 선택');
    expect(first!.textContent).toContain('2번째 선택');
    expect(third!.textContent).toContain('3번째 선택');

    await user.click(second!);

    expect(second!.getAttribute('aria-pressed')).toBe('false');
    expect(first!.textContent).toContain('1번째 선택');
    expect(third!.textContent).toContain('2번째 선택');
  });

  it('고른 사진이 생기면 「⋯」가 켜지고 모두 해제하면 다시 꺼진다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '선택' }));
    const [first] = photoButtons();

    await user.click(first!);
    expect(menuButton().hasAttribute('disabled')).toBe(false);

    await user.click(first!);
    expect(menuButton().hasAttribute('disabled')).toBe(true);
  });

  it('필터 칩에 고른 장수가 붙고 0장인 칩에는 숫자가 없다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '선택' }));
    expect(screen.getByRole('radio', { name: '전체' })).toBeTruthy();

    const [first, second] = photoButtons();
    await user.click(first!);
    await user.click(second!);

    expect(screen.getByRole('radio', { name: '전체 (2)' })).toBeTruthy();
    const chips = screen.getAllByRole('radio').map((radio) => radio.textContent ?? '');
    // 고른 사진을 올린 멤버 칩에만 숫자가 붙는다
    expect(chips.some((text) => /\(\d+\)/.test(text) && !text.startsWith('전체'))).toBe(true);
    expect(chips.some((text) => !/\(\d+\)/.test(text))).toBe(true);
  });

  it('최대 장수를 넘겨 고르면 선택되지 않고 안내 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderScreen(ready(manyPhotos(MAX_SELECTION + 1)));
    await user.click(screen.getByRole('button', { name: '선택' }));
    const buttons = photoButtons();

    for (const button of buttons.slice(0, MAX_SELECTION)) await user.click(button);
    expect(toast).not.toHaveBeenCalled();

    await user.click(buttons[MAX_SELECTION]!);

    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.maxSelection);
    expect(buttons[MAX_SELECTION]!.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('radio', { name: `전체 (${MAX_SELECTION})` })).toBeTruthy();
  });

  it('「취소」를 누르면 선택이 모두 풀리고 보통 화면으로 돌아온다', async () => {
    const user = userEvent.setup();
    const { container } = renderScreen();
    await user.click(screen.getByRole('button', { name: '선택' }));
    await user.click(photoButtons()[0]!);

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.getByRole('button', { name: '선택' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '사진 올리기' })).toBeTruthy();
    expect(container.querySelector('[data-hide-main-tab-bar]')).toBeNull();
    expect(photoButtons()).toHaveLength(0);

    // 다시 들어가면 이전 선택이 남아 있지 않다
    await user.click(screen.getByRole('button', { name: '선택' }));
    expect(screen.getByRole('radio', { name: '전체' })).toBeTruthy();
  });

  it('처리 중이거나 불러오지 못한 사진은 선택 모드에서도 고를 수 없다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '선택' }));

    const placeholders = screen.getAllByRole('img', { name: /처리 중인 사진|불러오지 못한 사진/ });
    expect(placeholders.length).toBeGreaterThan(0);
    expect(placeholders.every((element) => !element.hasAttribute('aria-pressed'))).toBe(true);
  });
});

describe('PhotoBoxScreen 선택 메뉴', () => {
  const selectFirst = async (user: ReturnType<typeof userEvent.setup>, count = 1) => {
    await user.click(screen.getByRole('button', { name: '선택' }));
    for (const button of photoButtons().slice(0, count)) await user.click(button);
  };

  it('「⋯」를 누르면 저장·번들 만들기·날짜 바꾸기·삭제 메뉴가 열리고 첫 항목에 포커스가 간다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await selectFirst(user);

    await user.click(menuButton());

    const menu = screen.getByRole('menu', { name: '사진 메뉴' });
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '저장',
      '번들 만들기',
      '날짜 바꾸기',
      '삭제',
    ]);
    expect(document.activeElement).toBe(items[0]);
    expect(menuButton().getAttribute('aria-haspopup')).toBe('menu');
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('고른 사진이 없으면 「⋯」가 꺼져 있어 메뉴가 열리지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '선택' }));

    await user.click(menuButton());

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('항목을 고르면 고른 사진 순서와 함께 동작을 알리고 메뉴가 닫히며 포커스가 「⋯」로 돌아온다', async () => {
    const user = userEvent.setup();
    const onMenuAction = vi.fn();
    render(<PhotoBoxScreen state={ready()} currentYear={2026} onMenuAction={onMenuAction} />);
    await selectFirst(user, 2);
    const [first, second] = photoButtons();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();

    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: '삭제' }));

    expect(onMenuAction).toHaveBeenCalledTimes(1);
    expect(onMenuAction).toHaveBeenCalledWith('delete', expect.any(Array));
    expect((onMenuAction.mock.calls[0]?.[1] as string[]).length).toBe(2);
    expect(document.activeElement).toBe(menuButton());
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('Esc를 누르면 메뉴가 닫히고 포커스가 「⋯」로 돌아온다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await selectFirst(user);
    await user.click(menuButton());

    await user.keyboard('{Escape}');

    expect(document.activeElement).toBe(menuButton());
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('메뉴 바깥을 누르면 닫힌다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await selectFirst(user);
    await user.click(menuButton());

    await user.click(screen.getByRole('heading', { level: 1, name: '사진함' }));

    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('선택을 모두 해제하면 열려 있던 메뉴도 닫힌다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await selectFirst(user);
    await user.click(menuButton());

    await user.click(photoButtons()[0]!);

    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('「취소」를 누르면 메뉴가 바로 사라진다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await selectFirst(user);
    await user.click(menuButton());

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
