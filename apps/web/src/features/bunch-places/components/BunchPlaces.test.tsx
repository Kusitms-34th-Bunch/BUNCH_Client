import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
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

beforeEach(() => {
  vi.clearAllMocks();
  // 고른 칩·스크롤은 history 항목에 남으므로 테스트마다 새 항목처럼 비움
  window.history.replaceState(null, '');
});
afterEach(() => vi.useRealTimers());

const checkBundle = vi.fn<(_bunchId: string, _bundleId: string) => Promise<'visible' | 'hidden'>>();
const bundleHref = (bunchId: string, bundleId: string) => `/bunches/${bunchId}/bundles/${bundleId}`;

const renderPlaces = () =>
  render(
    <BunchPlaces
      backHref="/bunch"
      feedHref="/feed"
      bundleHref={bundleHref}
      checkBundle={checkBundle}
    />,
    { wrapper: createQueryWrapper() },
  );

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

describe('BunchPlaces 카드 눌러 번들로 이동(기능명세서 8.1.5)', () => {
  it('고른 칩을 history 항목에 남겨, 번들 상세에서 돌아오면 그 칩으로 보이고 새로 들어오면 「전체」다', async () => {
    const user = userEvent.setup();
    const first = renderPlaces();
    await screen.findByText('봄날카페');
    await user.click(chip('경진 2'));
    await waitFor(() => expect(chip('경진 2')).toHaveAttribute('aria-checked', 'true'));
    first.unmount();

    // 같은 history 항목으로 돌아옴(뒤로 가기)
    const back = renderPlaces();
    await waitFor(() => expect(chip('경진 2')).toHaveAttribute('aria-checked', 'true'));
    back.unmount();

    // 새 항목(다시 들어옴)
    window.history.replaceState(null, '');
    renderPlaces();
    await waitFor(() => expect(chip('전체 7')).toHaveAttribute('aria-checked', 'true'));
  });

  const card = (name: string) =>
    screen.getAllByRole('button').find((button) => button.textContent?.includes(name))!;

  it('볼 수 있으면 그 번들 상세로 이동한다', async () => {
    checkBundle.mockResolvedValue('visible');
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');

    await user.click(card('봄날카페'));

    const kok = mockDb.get().koks.find((item) => item.name === '봄날카페')!;
    const bundle = mockDb.get().bundles.find((item) => item.id === kok.sourceBundleId)!;
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/bunches/${bundle.bunchId}/bundles/${bundle.id}`),
    );
    expect(checkBundle).toHaveBeenCalledWith(String(bundle.bunchId), String(bundle.id));
  });

  it('누른 순간 볼 수 없게 됐으면 이동하지 않고 모달을 띄우고, 「취소」 뒤 카드를 볼 수 없는 번들로 바꾼다', async () => {
    checkBundle.mockResolvedValue('hidden');
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');

    await user.click(card('봄날카페'));

    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('이 장소가 담긴 번들을 더 이상 볼 수 없어요'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(card('봄날카페').textContent).toContain('볼 수 없는 번들이에요');
    expect(push).not.toHaveBeenCalled();
    expect(kokNames()).toContain('봄날카페');
  });

  it('확인 요청이 실패하면 이동하지 않고 오류 토스트를 띄운다', async () => {
    checkBundle.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');

    await user.click(card('봄날카페'));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('확인을 기다리는 사이 화면을 떠나면 이동하지 않는다', async () => {
    let resolve!: (_value: 'visible') => void;
    checkBundle.mockReturnValue(new Promise((done) => (resolve = done)));
    const user = userEvent.setup();
    const view = renderPlaces();
    await screen.findByText('봄날카페');

    await user.click(card('봄날카페'));
    view.unmount();
    resolve('visible');
    // 확인 응답 뒤 이어지는 처리(이동 여부)가 끝나기를 기다림
    await act(() => Promise.resolve());

    expect(push).not.toHaveBeenCalled();
  });

  it('확인하는 동안 다시 눌러도 한 번만 확인한다', async () => {
    let resolve!: (_value: 'visible') => void;
    checkBundle.mockReturnValue(new Promise((done) => (resolve = done)));
    const user = userEvent.setup();
    renderPlaces();
    await screen.findByText('봄날카페');

    await user.click(card('봄날카페'));
    await user.click(card('봄날카페'));
    resolve('visible');

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(checkBundle).toHaveBeenCalledTimes(1);
  });
});

describe('BunchPlaces 이어 불러오기(기능명세서 8.1.3)', () => {
  type ObserverCallback = (_entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void;
  let callbacks: ObserverCallback[] = [];
  const observed = new Set<Element>();
  let failNext: (_value: boolean) => void = () => undefined;
  let nextRequests = 0;
  // 지금 감지 중인 요소가 있을 때만 끝이 보였다고 알림(감지 요소가 다시 붙지 않았는데 다음 쪽을 받는 경우를 걸러냄)
  const showEnd = () =>
    act(() => {
      if (observed.size === 0) return;
      for (const callback of callbacks) callback([{ isIntersecting: true }]);
    });

  beforeEach(() => {
    callbacks = [];
    observed.clear();
    nextRequests = 0;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: ObserverCallback) {
          callbacks.push(callback);
        }
        observe(element: Element) {
          observed.add(element);
        }
        unobserve(element: Element) {
          observed.delete(element);
        }
        disconnect() {
          observed.clear();
        }
      },
    );
    // 커서 동작만 보면 되므로 5개씩 나눠 주는 응답(12개: 5·5·2)으로 바꿈
    // 실제 쪽 크기(50개) 응답은 happy-dom에서 본문이 커 ky가 끝까지 읽지 못해 쓰지 않음
    let failing = false;
    server.use(
      http.get('/api/pinned-places', ({ request }) => {
        const cursor = new URL(request.url).searchParams.get('cursor');
        if (cursor !== null) nextRequests += 1;
        if (failing && cursor !== null) return fail(500, 'COMMON_999');
        const offset = Number(cursor ?? 0);
        const items = Array.from({ length: 12 }, (_, index) => ({
          id: 2000 + index,
          provider: 'kakao',
          externalId: `page-${index}`,
          name: `장소 ${index}`,
          address: null,
          pinnedByMemberId: null,
          pinnedAt: '2026-11-01T00:00:00.000Z',
          sourceType: 'ADVERTISEMENT',
          sourceAccessible: true,
          sourceBundleId: null,
          sourceBunchId: null,
          sourceBunchName: null,
          sourceBundleTitle: null,
        })).slice(offset, offset + 5);
        return ok({
          bunchId: MOCK_BUNCH_ID,
          selectedMemberId: null,
          totalCount: 12,
          members: [],
          items,
          nextCursor: offset + 5 < 12 ? String(offset + 5) : null,
        });
      }),
    );
    failNext = (value: boolean) => {
      failing = value;
    };
  });
  afterEach(() => vi.unstubAllGlobals());

  it('첫 쪽만 보이다가 목록 끝이 보이면 다음 쪽을 이어 붙이고, 마지막 쪽이면 더 받지 않는다', async () => {
    renderPlaces();
    await screen.findByText('장소 0');
    expect(screen.getAllByRole('listitem')).toHaveLength(5);

    showEnd();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(10));
    // 쪽이 늘면 감지 요소를 새로 붙여 아직 보이면 다음 쪽을 받음
    showEnd();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(12));
    expect(screen.getByText('장소 11')).toBeInTheDocument();
    expect(observed.size).toBe(0);
  });

  it('다음 쪽을 받지 못해도 보이던 카드는 그대로 두고, 다시 끝이 보이면 다시 받는다', async () => {
    failNext(true);
    renderPlaces();
    await screen.findByText('장소 0');

    showEnd();
    await waitFor(() => expect(nextRequests).toBe(1));
    // 실패 처리가 끝날 때까지(받는 중 표시가 풀릴 때까지) 기다린 뒤 다시 끝을 보임
    await waitFor(() => expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'false'));
    // 실패는 따로 알리지 않고 보이던 카드를 그대로 둠(기능명세서 8.1.3 예외)
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(toast).not.toHaveBeenCalled();

    failNext(false);
    showEnd();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(10));
  });
});
