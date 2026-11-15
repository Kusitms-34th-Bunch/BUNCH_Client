import { useInfiniteQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { clearHiddenAds, readHiddenAds } from '../lib/hiddenAds';
import { toFeedEntries } from '../model/feed';
import { feedQueryOptions } from '../queries/feed';
import { FeedAdCard } from './FeedAdCard';

const toast = vi.fn();
const onGone = vi.fn();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

// 서버의 광고 콕 상태와 받은 요청
let kok: { pinned: boolean; pinId: number | null };
let requests: string[];
const serveAd = () =>
  server.use(
    http.get('/api/feed', () =>
      ok({
        anchorTime: '2026-11-15T00:00:00Z',
        canInteract: true,
        size: 20,
        bundleCount: 0,
        items: [
          {
            type: 'ADVERTISEMENT',
            advertisement: {
              id: 71,
              name: '플로디스튜디오',
              introduction: '여기서 뭉쳐봐요!',
              photoUrl: '/ad.jpg',
              tags: [],
              place: { provider: 'kakao', externalId: 'ad-71', name: '플로디스튜디오' },
              ...kok,
              canPin: true,
            },
          },
        ],
        nextCursor: null,
        hasNext: false,
        endReached: true,
      }),
    ),
    http.put('/api/feed/advertisements/:id/pin', () => {
      requests.push('pin');
      kok = { pinned: true, pinId: 500 };
      return ok({ id: 500 });
    }),
    http.delete('/api/pinned-places/:pinId', ({ params }) => {
      requests.push(`unpin ${String(params.pinId)}`);
      kok = { pinned: false, pinId: null };
      return ok(null);
    }),
    http.put('/api/feed/advertisements/:id/hide', () => {
      requests.push('hide');
      return ok(null);
    }),
  );

// 피드 화면처럼 피드 캐시의 광고를 카드에 넘김
function Harness({ viewerId }: { viewerId: string | null }) {
  const { data } = useInfiniteQuery(feedQueryOptions(viewerId));
  const entry = data && toFeedEntries(data.pages)[0];
  return <ul>{entry?.kind === 'ad' ? <FeedAdCard ad={entry.ad} onGone={onGone} /> : null}</ul>;
}

const render$ = (bunch: { id: string; name: string } | null) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<Harness viewerId={bunch?.id ?? null} />, { wrapper: createQueryWrapper(client) });
};

const setup = async (
  bunch: { id: string; name: string } | null = { id: 'b', name: '여행가조' },
) => {
  render$(bunch);
  await screen.findByRole('button', { name: /더보기/ });
  return userEvent.setup();
};

// 4초·400ms 타이머를 직접 넘기는 테스트용
const setupWithTimers = async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  render$({ id: 'b', name: '여행가조' });
  await screen.findByRole('button', { name: /더보기/ });
  return user;
};

const openConfirm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '플로디스튜디오 광고 더보기' }));
  return screen.findByRole('dialog', { name: /^이 장소를 숨길까요?/ });
};

beforeEach(() => {
  toast.mockClear();
  onGone.mockClear();
  kok = { pinned: false, pinId: null };
  requests = [];
  serveAd();
  clearHiddenAds();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FeedAdCard', () => {
  it('더보기 → 확인 시트의 숨기기를 누르면 서버에 보내고, 숨김 안내로 바꾸며 초점을 옮긴다', async () => {
    const user = await setup();

    const sheet = await openConfirm(user);
    expect(within(sheet).getByText(/BUNCH 팀이 번치가 모이기 좋은 곳/)).toBeTruthy();
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));

    const notice = await screen.findByText('장소를 숨김 처리 했어요');
    expect(requests).toEqual(['hide']);
    expect(screen.queryByRole('button', { name: /더보기/ })).toBeNull();
    await waitFor(() => expect(notice.closest('article')).toHaveFocus());
    expect(
      screen.getByRole('article', { name: '광고 플로디스튜디오, 장소를 숨김 처리 했어요' }),
    ).toBeTruthy();
    expect(readHiddenAds().has('71')).toBe(true);
  });

  it('숨기는 동안 상태를 알리고, 더보기를 다시 눌러도 시트를 열지 않는다', async () => {
    let finish = () => {};
    server.use(
      http.put(
        '/api/feed/advertisements/:id/hide',
        () =>
          new Promise<Response>((resolve) => {
            finish = () => resolve(ok(null));
          }),
      ),
    );
    const user = await setup();

    await user.click(within(await openConfirm(user)).getByRole('button', { name: '숨기기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    expect(screen.getByText('장소를 숨기는 중이에요')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('article', { name: '광고 플로디스튜디오' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await user.click(screen.getByRole('button', { name: /더보기/ }));
    expect(screen.queryByRole('dialog')).toBeNull();

    finish();
    expect(await screen.findByText('장소를 숨김 처리 했어요')).toBeTruthy();
  });

  it('응답을 기다리는 사이 초점을 다른 곳으로 옮겼으면 숨김 안내가 초점을 가져가지 않는다', async () => {
    let finish = () => {};
    server.use(
      http.put(
        '/api/feed/advertisements/:id/hide',
        () =>
          new Promise<Response>((resolve) => {
            finish = () => resolve(ok(null));
          }),
      ),
    );
    const user = await setup();
    const elsewhere = document.body.appendChild(document.createElement('button'));

    await user.click(within(await openConfirm(user)).getByRole('button', { name: '숨기기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    elsewhere.focus();
    finish();

    await screen.findByText('장소를 숨김 처리 했어요');
    expect(elsewhere).toHaveFocus();
    elsewhere.remove();
  });

  it('숨기기가 실패하면 숨김 안내 없이 카드를 그대로 둔다', async () => {
    server.use(http.put('/api/feed/advertisements/:id/hide', () => fail(500, 'COMMON_999')));
    const user = await setup();

    const sheet = await openConfirm(user);
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText('장소를 숨김 처리 했어요')).toBeNull();
    expect(screen.getByRole('button', { name: /더보기/ })).toBeTruthy();
    expect(readHiddenAds().has('71')).toBe(false);
  });

  it('숨김 안내를 4초 보여 준 뒤 접히기 시작하고, 끝나면 사라졌다고 알린다', async () => {
    const user = await setupWithTimers();

    const sheet = await openConfirm(user);
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));
    const notice = await screen.findByText('장소를 숨김 처리 했어요');
    const wrapper = notice.closest('li')!;
    expect(wrapper.classList.contains('opacity-0')).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(wrapper.classList.contains('opacity-0')).toBe(true);
    expect(onGone).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(onGone).toHaveBeenCalledWith('71', true);
  });

  it('확인 시트의 취소는 보내지 않고 카드를 그대로 둔다', async () => {
    const user = await setup();

    const sheet = await openConfirm(user);
    await user.click(within(sheet).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: /더보기/ })).toBeTruthy();
    expect(requests).toEqual([]);
  });

  it('소속 번치가 없어도 숨길 수 있다', async () => {
    const user = await setup(null);

    const sheet = await openConfirm(user);
    await user.click(within(sheet).getByRole('button', { name: '숨기기' }));

    expect(await screen.findByText('장소를 숨김 처리 했어요')).toBeTruthy();
  });

  it('「콕하기」는 토스트 없이 「콕 했어요」로 바꿔 한 번 보내고, 빠른 둘째 탭은 무시한다', async () => {
    const user = await setup();

    await user.dblClick(screen.getByRole('button', { name: '콕하기' }));

    expect(screen.getByRole('button', { name: '콕 했어요' })).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await waitFor(() => expect(requests).toEqual(['pin']));
    expect(toast).not.toHaveBeenCalled();
  });

  it('콕하기가 실패하면 「콕하기」로 돌리고 알린다', async () => {
    server.use(http.put('/api/feed/advertisements/:id/pin', () => fail(500, 'COMMON_999')));
    const user = await setup();

    await user.click(screen.getByRole('button', { name: '콕하기' }));

    expect(await screen.findByRole('button', { name: '콕하기' })).toBeTruthy();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
  });

  it('간격을 두고 다시 누르면 콕 취소 확인 창을 연다', async () => {
    const user = await setupWithTimers();

    await user.click(screen.getByRole('button', { name: '콕하기' }));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    await waitFor(() => expect(requests).toEqual(['pin']));
    await user.click(screen.getByRole('button', { name: '콕 했어요' }));

    expect(await screen.findByRole('alertdialog')).toBeTruthy();
  });

  it('「콕 했어요」는 확인 창을 열고, 「삭제하기」면 콕 ID로 취소해 「콕하기」로 돌린다', async () => {
    kok = { pinned: true, pinId: 42 };
    const user = await setup();

    await user.click(screen.getByRole('button', { name: '콕 했어요' }));
    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    expect(
      within(dialog).getByText('‘플로디스튜디오’가 번치의 콕한 장소에서 삭제돼요.'),
    ).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    expect(await screen.findByRole('button', { name: '콕하기' })).toBeTruthy();
    await waitFor(() => expect(requests).toEqual(['unpin 42']));
  });

  it('다른 멤버가 이미 뺀 콕을 취소하면 알리지 않고 「콕하기」로 둔다', async () => {
    kok = { pinned: true, pinId: 42 };
    server.use(http.delete('/api/pinned-places/:pinId', () => fail(404, 'RESOURCE_001')));
    const user = await setup();

    await user.click(screen.getByRole('button', { name: '콕 했어요' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('button', { name: '콕하기' })).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  it('소속 번치가 없으면 담긴 표시가 없고 눌러도 보내지 않으며 안내한다', async () => {
    kok = { pinned: true, pinId: 42 };
    const user = await setup(null);

    await user.click(screen.getByRole('button', { name: '콕하기' }));

    expect(screen.getByRole('button', { name: '콕하기' })).toBeTruthy();
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
    expect(requests).toEqual([]);
  });
});
