import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { UNDO_DURATION } from '../hooks/useBunchPlaces';
import { BunchPlaces } from './BunchPlaces';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), replace, push }),
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

const renderPlaces = () =>
  render(<BunchPlaces backHref="/bunch" feedHref="/feed" />, { wrapper: createQueryWrapper() });

const chip = (name: string) => screen.getByRole('radio', { name });
const kokNames = () => mockDb.get().koks.map((kok) => kok.name);

const openMenu = async (user: ReturnType<typeof userEvent.setup>, place: string, item: string) => {
  await user.click(await screen.findByRole('button', { name: `${place} 더보기` }));
  await user.click(await screen.findByRole('button', { name: item }));
};

const undoOptions = () =>
  toast.mock.calls.find(([message]) => message === '콕한 장소에서 뺐어요')?.[1];

describe('BunchPlaces', () => {
  it('지금 번치의 콕한 장소를 최근 콕한 순으로, 멤버 칩은 서버 개수로 보여 준다', async () => {
    renderPlaces();

    expect(await screen.findByText('봄날카페')).toBeInTheDocument();
    // 나간 멤버(해리단길)의 콕은 「전체」에만 셈
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      '전체 7',
      '지예 1',
      '경진 2',
      '은우 3',
      '수인',
      '큐시즘',
    ]);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('봄날카페'),
      expect.stringContaining('계동 골목 식당'),
      expect.stringContaining('안목해변 커피거리'),
      expect.stringContaining('광안리 해변'),
      expect.stringContaining('연남동 책방'),
      expect.stringContaining('협재해변'),
      expect.stringContaining('해리단길'),
    ]);
  });

  it('멤버 칩을 고르면 그 멤버가 처음 콕한 장소만 서버에서 받아 보여 준다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');

    await user.click(chip('경진 2'));

    await waitFor(() => expect(chip('경진 2')).toHaveAttribute('aria-checked', 'true'));
    await waitFor(() =>
      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        expect.stringContaining('광안리 해변'),
        expect.stringContaining('연남동 책방'),
      ]),
    );
  });

  it('방향키로 칩을 옮겨 새 목록이 와도 초점은 칩에 남는다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');
    await user.click(chip('경진 2'));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));

    await user.keyboard('{ArrowRight}');

    await waitFor(() =>
      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        expect.stringContaining('봄날카페'),
        expect.stringContaining('계동 골목 식당'),
        expect.stringContaining('안목해변 커피거리'),
      ]),
    );
    expect(chip('은우 3')).toHaveFocus();
  });

  it('고른 멤버가 그사이 나가 서버가 전체를 주면 「전체」 칩이 선택된다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');
    await user.click(chip('경진 2'));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => !(item.bunchId === MOCK_BUNCH_ID && item.memberId === MOCK_MEMBER_IDS.memberA),
      ),
    }));

    // 빼기 요청 뒤 다시 받은 목록에서 경진은 멤버가 아님
    await openMenu(user, '광안리 해변', '콕에서 빼기');
    await openMenu(user, '연남동 책방', '콕에서 빼기');

    // 두 번째로 뺀 장소는 아직 보류 중이라 숨김(전체 7 - 보낸 1 - 숨김 1)
    await waitFor(() => expect(chip('전체 5')).toHaveAttribute('aria-checked', 'true'));
    expect(screen.queryByRole('radio', { name: /경진/ })).toBeNull();
  });

  it('주소를 클립보드에 복사하고 토스트로 알린다', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderPlaces();

    await openMenu(user, '봄날카페', '주소 복사하기');

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('제주 제주시 애월읍'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        '주소를 복사했어요.',
        expect.objectContaining({ icon: 'success' }),
      ),
    );
  });

  it('복사에 실패하면 오류 토스트를 보인다', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    renderPlaces();

    await openMenu(user, '봄날카페', '주소 복사하기');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
  });

  it('콕에서 빼면 카드와 칩 숫자가 바로 줄고, 되돌리면 서버에 요청하지 않고 원래대로 돌린다', async () => {
    const user = userEvent.setup();
    renderPlaces();

    await openMenu(user, '계동 골목 식당', '콕에서 빼기');

    await waitFor(() => expect(screen.queryByText('계동 골목 식당')).toBeNull());
    expect(chip('전체 6')).toBeInTheDocument();
    expect(chip('은우 2')).toBeInTheDocument();
    // 되돌리기 시간 동안은 서버에서 지우지 않음(명세 009)
    expect(kokNames()).toContain('계동 골목 식당');
    const options = undoOptions();
    expect(options?.action?.label).toBe('되돌리기');
    expect(options?.duration).toBe(UNDO_DURATION);

    act(() => options?.action?.onClick());

    expect(await screen.findByText('계동 골목 식당')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '계동 골목 식당 더보기' })).toHaveFocus(),
    );
    expect(chip('전체 7')).toBeInTheDocument();
    expect(kokNames()).toContain('계동 골목 식당');
  });

  it('같은 장소를 다시 빼고 되돌려도 다시 생긴 카드로 초점이 옮겨진다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    const undoLast = () => {
      const calls = toast.mock.calls.filter(([message]) => message === '콕한 장소에서 뺐어요');
      act(() => calls.at(-1)?.[1]?.action?.onClick());
    };

    for (let round = 0; round < 2; round += 1) {
      await openMenu(user, '계동 골목 식당', '콕에서 빼기');
      await waitFor(() => expect(screen.queryByText('계동 골목 식당')).toBeNull());
      undoLast();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: '계동 골목 식당 더보기' })).toHaveFocus(),
      );
    }
  });

  it('되돌리지 않으면 되돌리기 시간이 지난 뒤 서버에서 지우고 다시 받은 목록을 보인다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPlaces();

    await openMenu(user, '계동 골목 식당', '콕에서 빼기');
    await waitFor(() => expect(screen.queryByText('계동 골목 식당')).toBeNull());
    expect(kokNames()).toContain('계동 골목 식당');

    act(() => {
      vi.advanceTimersByTime(UNDO_DURATION);
    });

    await waitFor(() => expect(kokNames()).not.toContain('계동 골목 식당'));
    // 서버 개수로 다시 받아도 한 번만 줄어 있음
    await waitFor(() => expect(chip('전체 6')).toBeInTheDocument());
    expect(screen.queryByText('계동 골목 식당')).toBeNull();
  });

  it('다른 장소를 또 빼면 앞서 보류한 빼기는 바로 서버에 보낸다', async () => {
    const user = userEvent.setup();
    renderPlaces();

    await openMenu(user, '계동 골목 식당', '콕에서 빼기');
    await waitFor(() => expect(screen.queryByText('계동 골목 식당')).toBeNull());
    await openMenu(user, '봄날카페', '콕에서 빼기');

    await waitFor(() => expect(kokNames()).not.toContain('계동 골목 식당'));
    expect(kokNames()).toContain('봄날카페');
  });

  it('화면을 떠나면 보류한 빼기를 서버에 보낸다', async () => {
    const user = userEvent.setup();
    const { unmount } = renderPlaces();

    await openMenu(user, '계동 골목 식당', '콕에서 빼기');
    await waitFor(() => expect(screen.queryByText('계동 골목 식당')).toBeNull());
    unmount();

    await waitFor(() => expect(kokNames()).not.toContain('계동 골목 식당'));
  });

  it('서버에서 지우지 못하면 오류를 알리고 카드를 돌려놓는다', async () => {
    server.use(http.delete('/api/pinned-places/:pinId', () => fail(500, 'COMMON_999')));
    const user = userEvent.setup();
    const { unmount } = renderPlaces();
    await openMenu(user, '계동 골목 식당', '콕에서 빼기');
    await waitFor(() => expect(screen.queryByText('계동 골목 식당')).toBeNull());
    await openMenu(user, '봄날카페', '콕에서 빼기');

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(await screen.findByText('계동 골목 식당')).toBeInTheDocument();
    unmount();
  });

  it('콕에서 빼면 초점이 같은 자리에 온 다음 카드의 더보기 버튼으로 옮겨진다', async () => {
    const user = userEvent.setup();
    renderPlaces();

    await openMenu(user, '계동 골목 식당', '콕에서 빼기');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '안목해변 커피거리 더보기' })).toHaveFocus(),
    );
  });

  it('볼 수 없는 번들 모달로 빼도 초점이 같은 자리에 온 다음 카드로 옮겨진다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('안목해변 커피거리');
    const card = screen
      .getAllByRole('listitem')
      .find((item) => item.textContent?.includes('안목해변 커피거리'))!;
    const cardButton = within(card)
      .getAllByRole('button')
      .find((button) => !button.getAttribute('aria-label')?.includes('더보기'))!;

    await user.click(cardButton);
    await user.click(
      await within(await screen.findByRole('alertdialog')).findByRole('button', {
        name: '콕에서 빼기',
      }),
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '광안리 해변 더보기' })).toHaveFocus(),
    );
  });

  it('마지막 장소까지 빼면 빈 상태를 보이고 「피드 둘러보기」로 피드에 간다', async () => {
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');
    await user.click(chip('지예 1'));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));

    await openMenu(user, '협재해변', '콕에서 빼기');

    const heading = await screen.findByRole('heading', { name: '아직 콕한 장소가 없어요' });
    // 뺀 카드가 사라져 초점이 갈 곳이 없으면 빈 상태 제목으로 옮김
    await waitFor(() => expect(heading).toHaveFocus());
    await user.click(screen.getByRole('button', { name: '피드 둘러보기' }));
    expect(push).toHaveBeenCalledWith('/feed');
  });

  it('목록을 받지 못하면 오류를 알리고 「다시 시도」로 다시 받는다', async () => {
    // 앞 테스트가 남긴 요청이 1회짜리 handler를 먼저 쓰지 않게 플래그로 실패를 켜고 끔
    let failing = true;
    server.use(
      http.get('/api/pinned-places', () => (failing ? fail(500, 'COMMON_999') : undefined)),
    );
    // 경계가 잡은 오류를 React가 console.error로 남길 때 happy-dom 요청 객체를 문자열로 바꾸다 실패해 막음
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    renderPlaces();

    // 받는 중 안내는 경계의 늘 있는 상태 영역에 들어감
    expect(await screen.findByText('콕한 장소를 불러오는 중이에요')).toHaveAttribute(
      'role',
      'status',
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');
    failing = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('봄날카페')).toBeInTheDocument();
  });

  it('소속 번치가 없으면 번치 탭(번치 없음 안내)으로 보낸다', async () => {
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter((item) => item.memberId !== MOCK_MY_MEMBER_ID),
    }));
    renderPlaces();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/bunch'));
  });
});
