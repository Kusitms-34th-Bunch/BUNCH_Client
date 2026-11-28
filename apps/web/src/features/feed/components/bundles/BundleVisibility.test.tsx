import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { feedKeys } from '../../queries/keys';
import { BundleVisibility } from './BundleVisibility';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/navigation/toastAfterNavigation', () => ({ toastAfterNavigation }));

const back = vi.fn();
const replace = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back, replace }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

// 우리 번치 번들 조회의 공개 범위·버전·수정 권한만 화면이 읽음. 1은 수정 권한이 있는 멤버 공개 번들, 2는 권한 없음
const managed = (canEdit: boolean) => ({
  status: 'PUBLISHED' as const,
  visibility: 'PRIVATE' as const,
  visibilityVersion: 3,
  permissions: { canEdit },
});

let lastClient: ReturnType<typeof createTestQueryClient>;
const renderScreen = (bundleId = '1', bunchPrivate = false) => {
  const client = createTestQueryClient();
  lastClient = client;
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
  client.setQueryData(feedKeys.managed('1', bundleId, '1'), managed(bundleId === '1'));
  return render(<BundleVisibility bunchId="1" bundleId={bundleId} bunchPrivate={bunchPrivate} />, {
    wrapper: createQueryWrapper(client),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BundleVisibility', () => {
  it('지금 공개 범위가 골라져 있고, 바꾸기 전에는 「수정하기」가 꺼져 있다', () => {
    renderScreen();

    expect(
      screen.getByRole('radiogroup', { name: '번들의 공개 범위를 설정해 주세요' }),
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: /멤버 공개/ })).toBeChecked();
    expect(screen.getByRole('button', { name: '수정하기' })).toBeDisabled();
  });

  it('바꾸고 「수정하기」를 누르면 받아 둔 버전으로 저장하고 상세로 돌아가 알린다', async () => {
    let body: unknown;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', async ({ request }) => {
        body = await request.json();
        return ok({ ...managed(true), visibility: 'PUBLIC', visibilityVersion: 4 });
      }),
    );
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('radio', { name: /전체 공개/ }));
    await user.click(screen.getByRole('button', { name: '수정하기' }));

    await waitFor(() =>
      expect(toastAfterNavigation).toHaveBeenCalledWith('공개 범위를 수정했어요.'),
    );
    expect(body).toEqual({ value: 'PUBLIC', expectedVersion: 3, mode: 'PUBLISHED' });
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
  });

  it('그사이 번들이 지워졌으면 지워진 상세로 돌아가지 않고 피드로 바꿔 가며, 떠날 때 그 번들 캐시를 비운다', async () => {
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', () => fail(404, 'RESOURCE_001')),
    );
    const user = userEvent.setup();
    const { unmount } = renderScreen();
    lastClient.setQueryData(feedKeys.list('1'), {
      pages: [
        {
          items: [
            { type: 'BUNDLE', bundle: { id: 1 } },
            { type: 'BUNDLE', bundle: { id: 2 } },
          ],
        },
      ],
      pageParams: [undefined],
    });

    await user.click(screen.getByRole('radio', { name: /전체 공개/ }));
    await user.click(screen.getByRole('button', { name: '수정하기' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/feed'));
    expect(back).not.toHaveBeenCalled();
    expect(toastAfterNavigation).toHaveBeenCalledWith('더 이상 볼 수 없는 번들이에요.');
    // 떠 있는 동안은 남겨 두고(빈 상세를 다시 받아 깜빡이지 않게) 떠날 때 비움
    expect(lastClient.getQueryData(feedKeys.managed('1', '1', '1'))).toBeDefined();
    unmount();
    expect(lastClient.getQueryData(feedKeys.managed('1', '1', '1'))).toBeUndefined();
    // 피드 카드에서도 빠짐
    const feed = lastClient.getQueryData<{ pages: { items: { bundle: { id: number } }[] }[] }>(
      feedKeys.list('1'),
    );
    expect(feed?.pages[0]?.items.map((item) => item.bundle.id)).toEqual([2]);
  });

  it('그사이 권한을 잃었으면 알리고 화면에 남는다', async () => {
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', () => fail(403, 'AUTH_002')),
    );
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('radio', { name: /전체 공개/ }));
    await user.click(screen.getByRole('button', { name: '수정하기' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('권한이 변경되어 해당 기능을 이용할 수 없어요.'),
    );
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(0);
  });

  it('다른 곳에서 먼저 바꿨으면 최신 값을 다시 받고 고른 값은 둔 채 알린다', async () => {
    let version = 3;
    server.use(
      http.put('/api/bunches/:bunchId/bundles/:id/visibility', () => {
        version = 5;
        return fail(409, 'BUNDLE_003');
      }),
      http.get('/api/bunches/:bunchId/bundles/:id', () =>
        ok({ ...managed(true), visibilityVersion: version }),
      ),
    );
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('radio', { name: /전체 공개/ }));
    await user.click(screen.getByRole('button', { name: '수정하기' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(screen.getByRole('radio', { name: /전체 공개/ })).toBeChecked();
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(0);
  });

  it.each([
    [403, 'AUTH_002'],
    [400, 'COMMON_001'],
  ])(
    '권한을 잃은 뒤 다시 받기가 %i면 처음 불러오기 실패와 같이 볼 수 없다는 안내로 바뀐다',
    async (status, code) => {
      server.use(
        http.put('/api/bunches/:bunchId/bundles/:id/visibility', () => fail(403, 'AUTH_002')),
        http.get('/api/bunches/:bunchId/bundles/:id', () => fail(status, code)),
      );
      const user = userEvent.setup();
      renderScreen();

      await user.click(screen.getByRole('radio', { name: /전체 공개/ }));
      await user.click(screen.getByRole('button', { name: '수정하기' }));

      expect(
        await screen.findByRole('heading', { name: '삭제되었거나 볼 수 없는 내용이에요' }),
      ).toHaveFocus();
    },
  );

  it('비공개 번치면 「전체 공개」 대신 「일부 공개」다', () => {
    renderScreen('1', true);

    expect(screen.getByRole('radio', { name: /일부 공개/ })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /전체 공개/ })).toBeNull();
  });

  it('수정 권한이 없는 번들로 직접 들어오면 볼 수 없다는 안내다', () => {
    renderScreen('2');
    expect(
      screen.getByRole('heading', { name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('상세를 받지 못하면(일시 오류) 안내와 다시 시도를 보이고, 다시 실패해도 안내로 초점을 둔다', async () => {
    server.use(http.get('/api/bunches/:bunchId/bundles/:id', () => fail(500, 'COMMON_999')));
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    render(<BundleVisibility bunchId="1" bundleId="9" bunchPrivate={false} />, {
      wrapper: createQueryWrapper(client),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');

    // 다시 실패해도 초점이 본문으로 빠지지 않고 안내(제목이나 다시 나온 버튼)에 남음
    await userEvent.setup().click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() =>
      expect(screen.getByRole('alert').parentElement?.contains(document.activeElement)).toBe(true),
    );
  });
});
