import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { FeedBundleMember, FeedPlace } from '../lib/types';
import { useBundleSheets } from './useBundleSheets';

const push = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

// 번들 7의 장소 71·72. 콕 여부는 서버(명세 021)에서 받고, 처음엔 72만 콕한 상태(콕 ID 5)
const places: FeedPlace[] = [
  { id: '71', name: '애월 한담해변', address: '제주 제주시 애월읍', picked: false },
  { id: '72', name: '제주 바다', address: '제주 서귀포시', picked: false },
];
let pinned: Record<number, number | null>;
const requests: string[] = [];
const serveKoks = () =>
  server.use(
    http.get('/api/bundles/:bundleId/pinned-places', () =>
      ok({
        bundleId: 7,
        canPin: true,
        locations: [71, 72].map((id, position) => ({
          id,
          provider: 'KAKAO',
          externalId: String(id),
          name: String(id),
          position,
          pinned: pinned[id] != null,
          pinId: pinned[id] ?? null,
        })),
      }),
    ),
    http.put('/api/bundles/:bundleId/locations/:locationId/pin', ({ params }) => {
      const id = Number(params.locationId);
      requests.push(`PUT ${id}`);
      pinned[id] = 100 + id;
      return ok({ id: 100 + id });
    }),
    http.delete('/api/pinned-places/:pinId', ({ params }) => {
      requests.push(`DELETE ${String(params.pinId)}`);
      for (const key of Object.keys(pinned)) {
        if (pinned[Number(key)] === Number(params.pinId)) pinned[Number(key)] = null;
      }
      return ok(null);
    }),
  );
const members: FeedBundleMember[] = [
  { id: 'm-1', name: '은우', role: 'owner' },
  { id: 'm-2', name: '경진' },
  { name: '탈퇴', role: 'coOwner', left: true },
];
function Harness() {
  const { openPlaces, openMembers } = useBundleSheets();
  return (
    <>
      <button type="button" onClick={() => openPlaces('7', places)}>
        위치
      </button>
      <button type="button" onClick={() => openPlaces('7', places.slice(0, 1))}>
        장소 하나
      </button>
      <button type="button" onClick={() => openMembers(members)}>
        멤버
      </button>
    </>
  );
}

const setup = async (
  open: '위치' | '장소 하나' | '멤버',
  bunch: { id: string; name: string } | null = { id: 'bunch-trip', name: '여행가조' },
) => {
  const user = userEvent.setup();
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<Harness />, { wrapper: createQueryWrapper(client) });
  await user.click(screen.getByRole('button', { name: open }));
  // 장소 시트는 콕 여부를 받은 뒤에 열림
  if (open !== '멤버') await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' });
  return user;
};

const pickButton = (place: string) =>
  screen.getByRole('button', { description: place, name: /콕/ });

beforeEach(() => {
  push.mockClear();
  toast.mockClear();
  pinned = { 71: null, 72: 5 };
  requests.length = 0;
  serveKoks();
});

describe('useBundleSheets', () => {
  it('장소마다 이름·주소와 서버의 콕 상태를 보여 준다', async () => {
    await setup('위치');

    expect(screen.getByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(screen.getByText('제주 제주시 애월읍')).toBeTruthy();
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕 했어요'));
    expect(pickButton('애월 한담해변').textContent).toBe('콕하기');
  });

  it('「콕하기」는 시트를 닫지 않고 「콕 했어요」로 바꾸며 서버에 콕한다', async () => {
    const user = await setup('위치');
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕 했어요'));

    await user.click(pickButton('애월 한담해변'));
    await waitFor(() => expect(requests).toEqual(['PUT 71']));

    expect(pickButton('애월 한담해변').textContent).toBe('콕 했어요');
    expect(toast).not.toHaveBeenCalled();
  });

  it('「콕 했어요」는 시트를 닫고 확인 창을 열며, 「삭제하기」면 서버에서 콕을 뺀다', async () => {
    const user = await setup('위치');
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕 했어요'));

    await user.click(pickButton('제주 바다'));

    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    expect(within(dialog).getByText('‘제주 바다’가 번치의 콕한 장소에서 삭제돼요.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(toast).not.toHaveBeenCalled();

    // 창이 닫히면 시트가 다시 올라오고(화면설계서) 뺀 장소는 「콕하기」
    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(pickButton('제주 바다').textContent).toBe('콕하기');
    expect(requests).toEqual(['DELETE 5']);

    // 취소한 장소는 다시 콕할 수 있음
    await user.click(pickButton('제주 바다'));
    expect(pickButton('제주 바다').textContent).toBe('콕 했어요');
  });

  it('위치가 하나여도 같은 시트로 열린다', async () => {
    await setup('장소 하나');

    expect(screen.getByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('확인 창의 「아니요」는 창을 닫고 시트를 다시 올리며 콕을 유지한다', async () => {
    const user = await setup('위치');
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕 했어요'));

    await user.click(pickButton('제주 바다'));
    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    await user.click(within(dialog).getByRole('button', { name: '아니요' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(pickButton('제주 바다').textContent).toBe('콕 했어요');
  });

  it('확인 창이 열린 동안 소속 번치가 없어지면 다시 올라온 시트는 그 상태로 그린다', async () => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), {
      memberId: 'me',
      bunch: { id: 'bunch-trip', name: '여행가조' },
    });
    render(<Harness />, { wrapper: createQueryWrapper(client) });
    await user.click(screen.getByRole('button', { name: '위치' }));
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕 했어요'));

    await user.click(pickButton('제주 바다'));
    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    act(() => {
      client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: null });
    });
    await user.click(within(dialog).getByRole('button', { name: '아니요' }));

    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(pickButton('제주 바다').textContent).toBe('콕하기');
    await user.click(pickButton('애월 한담해변'));
    expect(pickButton('애월 한담해변').textContent).toBe('콕하기');
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', { position: 'top' });
  });

  it('소속 번치가 없으면 담긴 표시가 없고 눌러도 바뀌지 않으며 안내한다', async () => {
    const user = await setup('위치', null);

    expect(pickButton('제주 바다').textContent).toBe('콕하기');
    await user.click(pickButton('애월 한담해변'));

    expect(pickButton('애월 한담해변').textContent).toBe('콕하기');
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', { position: 'top' });
  });

  it('콕하기가 실패하면 「콕하기」로 되돌리고 알린다', async () => {
    server.use(
      http.put('/api/bundles/:bundleId/locations/:locationId/pin', () => fail(500, 'COMMON_999')),
    );
    const user = await setup('위치');
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕 했어요'));

    await user.click(pickButton('애월 한담해변'));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요', {
        position: 'top',
      }),
    );
    expect(pickButton('애월 한담해변').textContent).toBe('콕하기');
  });

  it('콕 여부를 받지 못하면 시트를 열지 않고 알리며, 다시 누르면 다시 받는다', async () => {
    server.use(
      http.get('/api/bundles/:bundleId/pinned-places', () => fail(500, 'COMMON_999'), {
        once: true,
      }),
    );
    const user = userEvent.setup();
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), {
      memberId: 'me',
      bunch: { id: 'bunch-trip', name: '여행가조' },
    });
    render(<Harness />, { wrapper: createQueryWrapper(client) });

    await user.click(screen.getByRole('button', { name: '위치' }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요', {
        position: 'top',
      }),
    );
    expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '위치' }));
    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(pickButton('제주 바다').textContent).toBe('콕 했어요');
  });

  it('다른 멤버가 이미 뺀 콕을 취소하면 알리지 않고 뺀 상태로 맞춘다', async () => {
    // 다른 멤버가 먼저 뺌(서버에는 이미 없음)
    server.use(
      http.delete('/api/pinned-places/:pinId', () => {
        pinned[72] = null;
        return fail(404, 'RESOURCE_001');
      }),
    );
    const user = await setup('위치');

    await user.click(pickButton('제주 바다'));
    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕하기'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('콕을 취소하고 바로 다시 콕하면 차례로 보내 「콕 했어요」로 남는다', async () => {
    const user = await setup('위치');

    await user.click(pickButton('제주 바다'));
    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));
    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    await user.click(pickButton('제주 바다'));

    await waitFor(() => expect(requests).toEqual(['DELETE 5', 'PUT 72']));
    await waitFor(() => expect(pickButton('제주 바다').textContent).toBe('콕 했어요'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('시트를 연 뒤 명의가 바뀌면 누른 장소를 보내지 않고 시트를 닫는다', async () => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), {
      memberId: 'me',
      bunch: { id: 'bunch-trip', name: '여행가조' },
    });
    render(<Harness />, { wrapper: createQueryWrapper(client) });
    await user.click(screen.getByRole('button', { name: '위치' }));
    await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' });

    act(() => {
      client.setQueryData(sharedKeys.me(), {
        memberId: 'me',
        bunch: { id: 'bunch-run', name: '러닝크루' },
      });
    });
    await user.click(pickButton('애월 한담해변'));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull(),
    );
    expect(requests).toEqual([]);
  });

  it('참여 멤버를 순서대로 보여 주고 나간 멤버는 「작성자」, 역할은 배지로 읽힌다', async () => {
    await setup('멤버');

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['은우', '경진', '작성자']);
    expect(within(items[0]!).getByRole('img', { name: '메인 관리자' })).toBeTruthy();
    // 나간 멤버는 기본 이미지이고 역할 배지 없음
    expect(items[2]!.querySelector('img')?.getAttribute('src')).toBe(DEFAULT_PROFILE_IMAGE);
    expect(within(items[2]!).queryByRole('img', { name: '공동 관리자' })).toBeNull();
    // 나간 멤버는 누를 수 없고 나머지는 멤버 프로필 링크
    expect(within(items[0]!).getByRole('link').getAttribute('href')).toBe('/members/m-1');
    expect(within(items[2]!).queryByRole('link')).toBeNull();
  });

  it('멤버를 누르면 시트가 닫힌 뒤 멤버 프로필로 이동한다', async () => {
    const user = await setup('멤버');

    await user.click(screen.getByRole('link', { name: /경진/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/members/m-2'));
    expect(screen.queryByRole('heading', { name: '참여 멤버' })).toBeNull();
  });

  it('멤버를 누르면 닫힘 애니메이션이 끝난 뒤에야 이동한다', async () => {
    let finish = () => {};
    const closing = {
      finished: new Promise<void>((resolve) => {
        finish = resolve;
      }),
      pending: false,
      playState: 'running',
      effect: { getTiming: () => ({ duration: 240, iterations: 1 }) },
    } as unknown as Animation;
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: () => [closing],
    });
    onTestFinished(() => {
      delete (Element.prototype as Partial<Element>).getAnimations;
    });
    await setup('멤버');

    fireEvent.click(screen.getByRole('link', { name: /경진/ }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(push).not.toHaveBeenCalled();

    finish();
    await waitFor(() => expect(push).toHaveBeenCalledWith('/members/m-2'));
  });

  it('보조 키로 누르면 시트를 닫지 않고 앱 이동도 하지 않는다', async () => {
    await setup('멤버');

    fireEvent.click(screen.getByRole('link', { name: /경진/ }), { metaKey: true });

    expect(screen.getByRole('heading', { name: '참여 멤버' })).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it('「취소」를 누르면 시트가 닫힌다', async () => {
    const user = await setup('멤버');

    await user.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: '참여 멤버' })).toBeNull());
  });
});
