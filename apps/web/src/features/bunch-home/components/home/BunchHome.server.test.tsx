import type * as DesignSystem from '@app/design-system';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { createBundle } from '@/features/bundle/api/bundles';
import { mockDb } from '@/mocks/db';
import {
  MOCK_BUNCH_ID,
  MOCK_PHOTO_IDS,
  MOCK_SECOND_BUNCH_ID,
  MOCK_MEMBER_IDS,
} from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { getMyBunches } from '@/shared/api/myBunches';
import { getPageLoadingCount } from '@/shared/lib/pageLoadingState';
import { sharedKeys } from '@/shared/query/keys';
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
  sessionStorage.clear();
});

// 작성 중인 번들 카드의 열기 버튼(같은 제목의 「삭제」 버튼과 구분)
const findDraftCard = async (title: string) => {
  const buttons = await screen.findAllByRole('button', { name: new RegExp(title) });
  const card = buttons.find((button) => !/삭제$/.test(button.getAttribute('aria-label') ?? ''));
  if (!card) throw new Error(`카드 없음: ${title}`);
  return card;
};

const renderHome = () => {
  const client = createTestQueryClient();
  render(<BunchHome />, { wrapper: createQueryWrapper(client) });
  return client;
};

// 서버(가짜 서버) 데이터로 번치 홈을 그리는 흐름: 프로필·개수·완성된 번들
describe('BunchHome 서버 데이터', () => {
  it('불러오는 동안은 로딩, 끝나면 내 기본 번치의 프로필과 기존 완성된 번들을 보인다', async () => {
    renderHome();
    expect(screen.queryByRole('heading', { name: '여행쥬아' })).toBeNull();

    expect(await screen.findByRole('heading', { name: /여행쥬아/ })).toBeInTheDocument();
    expect(screen.getByText('여행 안 갈 바엔 죽을란다')).toBeInTheDocument();
    // 기존 발행 번들 2개가 발행 최신순으로 보임
    const first = await screen.findByAltText(/강릉 커피 투어/);
    const second = await screen.findByAltText(/망원 한강 피크닉/);
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('새로 발행한 번들은 기존 번들보다 앞에 보인다(발행 뒤 번치 홈 key를 무효화하면)', async () => {
    const client = renderHome();
    await screen.findByAltText(/강릉 커피 투어/);

    // 내가 새 번들을 발행한 상황: 서버에 최신 발행본이 생기고 번치 홈 데이터 전체가 무효화됨
    mockDb.update((current) => ({
      ...current,
      bundles: [
        ...current.bundles,
        {
          ...current.bundles[0]!,
          id: 9,
          title: '속초 첫째 날 🌊',
          publishedAt: '2026-11-04T09:00:00.000Z',
          updatedAt: '2026-11-04T09:00:00.000Z',
        },
      ],
    }));
    await act(() => client.invalidateQueries({ queryKey: sharedKeys.bunchHomeScope('1') }));

    const added = await screen.findByAltText(/속초 첫째 날/);
    const existing = screen.getByAltText(/강릉 커피 투어/);
    expect(added.compareDocumentPosition(existing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('불러오지 못하면 오류 화면을 보이고 「다시 시도」로 번치 홈이 나온다', async () => {
    let failing = true;
    server.use(
      http.get('/api/bunches/:bunchId/home', () => (failing ? fail(500, 'COMMON_500') : undefined)),
    );
    renderHome();

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    failing = false;
    await userEvent.click(retry);

    expect(await screen.findByRole('heading', { name: /여행쥬아/ })).toBeInTheDocument();
  });

  it('내 번치가 아닌 응답(소속 null)은 오류 화면이고 「다시 시도」로 다시 받는다', async () => {
    let external = true;
    server.use(
      http.get('/api/bunches/:bunchId/home', () =>
        external
          ? ok({
              bunch: {
                id: 1,
                name: '여행쥬아',
                imageUrl: null,
                characterType: 'TYPE_1',
                visibility: 'PRIVATE',
                introduction: null,
              },
              myMembership: null,
              permissions: {
                canEditProfile: false,
                canDeleteBunch: false,
                canManageRoles: false,
                canTransferOwner: false,
                canBlock: false,
                canInvite: false,
                canLeave: false,
              },
              profileVersion: null,
              membershipVersion: null,
              memberCount: 5,
              followerCount: 3,
              followingCount: 2,
              draftCount: null,
              publishedCount: null,
              stage: 1,
              unreadCount: null,
            })
          : undefined,
      ),
    );
    renderHome();

    const retry = await screen.findByRole('button', { name: '다시 시도' });
    external = false;
    await userEvent.click(retry);

    expect(await screen.findByRole('heading', { name: /여행쥬아/ })).toBeInTheDocument();
  });

  it('작성 중인 번들 탭에 서버의 초안이 카드로 보이고 누르면 작성 화면으로 이동한다', async () => {
    const { P1, P2, P3, P4 } = MOCK_PHOTO_IDS;
    const created = await createBundle('1', [P1, P2, P3, P4].map(String), createIdempotencyKey(), [
      String(MOCK_MEMBER_IDS.memberA),
    ]);
    renderHome();

    await screen.findByAltText(/강릉 커피 투어/);
    await userEvent.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    await userEvent.click(await findDraftCard('제목 미정'));

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/bunch/drafts/${created.id}`));
  });

  // 목록을 받은 뒤 다른 멤버가 지우거나 발행한 초안(기능명세 5.3.1 예외 처리)
  it.each([
    ['삭제', '삭제된 번들이에요.'],
    ['발행', '발행된 번들이에요.'],
  ] as const)(
    '이미 %s된 초안을 누르면 이동하지 않고 안내 뒤 목록을 갱신한다',
    async (kind, message) => {
      const created = await createBundle(
        '1',
        [MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S5].map(String),
        createIdempotencyKey(),
        [String(MOCK_MEMBER_IDS.memberA)],
      );
      renderHome();
      await screen.findByAltText(/강릉 커피 투어/);
      await userEvent.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
      const card = await findDraftCard('제목 미정');

      mockDb.update((current) => ({
        ...current,
        bundles:
          kind === '삭제'
            ? current.bundles.filter((bundle) => String(bundle.id) !== created.id)
            : current.bundles.map((bundle) =>
                String(bundle.id) === created.id
                  ? { ...bundle, status: 'PUBLISHED', publishedAt: '2026-11-19T00:00:00.000Z' }
                  : bundle,
              ),
      }));
      await userEvent.click(card);

      await waitFor(() => expect(toast).toHaveBeenCalledWith(message));
      expect(push).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /제목 미정 삭제/ })).toBeNull(),
      );
    },
  );

  it('제목을 아직 쓰지 않은 초안은 「제목 미정」을 흐리게 보인다(기능명세 5.3.1)', async () => {
    await createBundle(
      '1',
      [MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S5].map(String),
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
    );
    renderHome();

    await screen.findByAltText(/강릉 커피 투어/);
    await userEvent.click(screen.getByRole('tab', { name: '작성 중인 번들' }));

    const card = await findDraftCard('제목 미정');
    expect(within(card).getByText('제목 미정').className).toContain('text-text-tertiary');
  });

  it('작성 중인 번들을 삭제하면 서버에서 지워지고 카드가 사라진다', async () => {
    const created = await createBundle(
      '1',
      [MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S5].map(String),
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
    );
    renderHome();

    await screen.findByAltText(/강릉 커피 투어/);
    await userEvent.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    await userEvent.click(await screen.findByRole('button', { name: /제목 미정 삭제/ }));
    const dialog = await screen.findByRole('alertdialog', { name: '작성 중인 번들을 삭제할까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    await waitFor(() =>
      expect(mockDb.get().bundles.some((bundle) => String(bundle.id) === created.id)).toBe(false),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /제목 미정 삭제/ })).toBeNull(),
    );
    expect(toast).toHaveBeenCalledWith('작성 중인 번들을 삭제했어요.');
  });

  // 서버가 요청한 사람 기준으로 계산한 삭제 권한(초안 생성자, 참여 중인 관리자)대로 휴지통을 보임(기능명세 5.3.2 로직 2)
  it('삭제 권한이 없는 초안에는 휴지통이 없다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/bundles', ({ request }) =>
        new URL(request.url).searchParams.get('status') === 'DRAFT'
          ? ok({
              items: [
                {
                  id: 77,
                  title: '남의 초안',
                  photos: [],
                  participants: [],
                  permissions: { canDelete: false },
                },
              ],
              page: 0,
              size: 50,
              total: 1,
            })
          : undefined,
      ),
    );
    renderHome();

    await screen.findByAltText(/강릉 커피 투어/);
    await userEvent.click(screen.getByRole('tab', { name: '작성 중인 번들' }));

    expect(await findDraftCard('남의 초안')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '남의 초안 삭제' })).toBeNull();
  });

  // 삭제 API는 발행본도 지우므로 직전에 상태를 확인(기능명세 5.3.2 예외 처리)
  it('그사이 발행된 초안은 지우지 않고 「이미 발행된 번들이에요.」를 띄운 뒤 창을 닫는다', async () => {
    const created = await createBundle(
      '1',
      [MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S5].map(String),
      createIdempotencyKey(),
      [String(MOCK_MEMBER_IDS.memberA)],
    );
    const deletes: string[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'DELETE') deletes.push(new URL(request.url).pathname);
    });
    renderHome();

    await screen.findByAltText(/강릉 커피 투어/);
    await userEvent.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
    await userEvent.click(await screen.findByRole('button', { name: /제목 미정 삭제/ }));
    const dialog = await screen.findByRole('alertdialog', { name: '작성 중인 번들을 삭제할까요?' });
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) =>
        String(bundle.id) === created.id
          ? { ...bundle, status: 'PUBLISHED', publishedAt: '2026-11-19T00:00:00.000Z' }
          : bundle,
      ),
    }));
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    onTestFinished(() => server.events.removeAllListeners());
    await waitFor(() => expect(toast).toHaveBeenCalledWith('이미 발행된 번들이에요.'));
    expect(deletes).toEqual([]);
    expect(mockDb.get().bundles.some((bundle) => String(bundle.id) === created.id)).toBe(true);
    await waitFor(() =>
      expect(
        screen.queryByRole('alertdialog', { name: '작성 중인 번들을 삭제할까요?' }),
      ).toBeNull(),
    );
  });

  // 삭제 실패(기능명세 5.3.2 예외 처리): 충돌·권한 거부는 안내 뒤 창을 닫고, 일시적 실패는 창을 유지
  it.each([
    [404, 'RESOURCE_001', '이미 삭제된 번들이에요.', false],
    [409, 'BUNDLE_002', '이미 발행된 번들이에요.', false],
    [403, 'AUTH_002', '번들은 초안을 만든 멤버나 참여 중인 관리자만 삭제할 수 있어요.', false],
    [500, 'COMMON_500', undefined, true],
  ] as const)(
    '삭제가 %i(%s)로 실패하면 알맞은 안내를 보이고 창 유지 여부를 정한다',
    async (status, code, message, keepsDialog) => {
      await createBundle(
        '1',
        [MOCK_PHOTO_IDS.S4, MOCK_PHOTO_IDS.S5].map(String),
        createIdempotencyKey(),
        [String(MOCK_MEMBER_IDS.memberA)],
      );
      server.use(http.delete('/api/bunches/:bunchId/bundles/:id', () => fail(status, code)));
      renderHome();

      await screen.findByAltText(/강릉 커피 투어/);
      await userEvent.click(screen.getByRole('tab', { name: '작성 중인 번들' }));
      await userEvent.click(await screen.findByRole('button', { name: /제목 미정 삭제/ }));
      const dialog = await screen.findByRole('alertdialog', {
        name: '작성 중인 번들을 삭제할까요?',
      });
      await userEvent.click(within(dialog).getByRole('button', { name: '삭제하기' }));

      await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
      if (message) expect(toast).toHaveBeenCalledWith(message);
      expect(toast).not.toHaveBeenCalledWith('작성 중인 번들을 삭제했어요.');
      if (keepsDialog) {
        expect(
          screen.getByRole('alertdialog', { name: '작성 중인 번들을 삭제할까요?' }),
        ).toBeTruthy();
      } else {
        await waitFor(() =>
          expect(
            screen.queryByRole('alertdialog', { name: '작성 중인 번들을 삭제할까요?' }),
          ).toBeNull(),
        );
      }
    },
  );

  it('완성된 번들이 없으면 빈 상태와 「첫 번들 만들기」를 보인다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles', () =>
        ok({ items: [], page: 0, size: 50, totalElements: 0, hasNext: false }),
      ),
    );
    renderHome();

    expect(await screen.findByRole('button', { name: '첫 번들 만들기' })).toBeInTheDocument();
  });

  it('안전하지 않은 표지 주소의 번들은 기본 이미지로 보이고 홈은 그대로 나온다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles', () =>
        ok({
          items: [
            {
              id: 5,
              bunchId: 1,
              title: '표지가 이상한 번들',
              coverImageUrl: 'javascript:alert(1)',
              date: null,
              location: null,
              publishedAt: '2026-11-04T09:00:00.000Z',
            },
          ],
          page: 0,
          size: 50,
          totalElements: 1,
          hasNext: false,
        }),
      ),
    );
    renderHome();

    expect(await screen.findByAltText(/표지가 이상한 번들/)).toBeInTheDocument();
    expect(screen.getByAltText(/표지가 이상한 번들/).getAttribute('src') ?? '').not.toContain(
      'javascript',
    );
  });

  it('소속 번치가 없으면 번치 없음 화면이다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    renderHome();

    await waitFor(() => expect(screen.queryByRole('heading', { name: /여행쥬아/ })).toBeNull());
    expect(await screen.findByRole('button', { name: /번치 (만들기|생성)/ })).toBeInTheDocument();
  });
});

// 번치 전환 시트: 내 소속 번치(`members/me/bunches`)·마지막 사용 번치 저장·접근 불가 안내
describe('BunchHome 서버 번치 전환', () => {
  const openSwitcher = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: /여행쥬아/ }));
    return screen.findByRole('dialog', { name: '번치 전환하기' });
  };

  it('전환 목록에 지금 번치가 맨 위, 다른 소속 번치, 접근 불가 번치 순으로 보인다', async () => {
    const user = userEvent.setup();
    renderHome();

    const sheet = await openSwitcher(user);
    await within(sheet).findByRole('button', { name: /퇴근런클럽/ });
    const names = within(sheet)
      .getAllByRole('button', { name: /여행쥬아|퇴근런클럽|홍대역|큐시즘 맛집/ })
      .map((row) => row.textContent);
    expect(names.map((name) => name?.match(/여행쥬아|퇴근런클럽|홍대역|큐시즘 맛집/)?.[0])).toEqual(
      ['여행쥬아', '퇴근런클럽', '홍대역', '큐시즘 맛집'],
    );
  });

  it('다른 번치를 고르면 마지막 사용 번치로 저장하고 그 번치 홈으로 바뀐 뒤 토스트로 알린다', async () => {
    const user = userEvent.setup();
    renderHome();

    const sheet = await openSwitcher(user);
    await user.click(await within(sheet).findByRole('button', { name: /퇴근런클럽/ }));

    // 새 번치 홈을 미리 받아 두어 로딩 화면을 거치지 않고 바뀜
    expect(await screen.findByRole('heading', { level: 1, name: /퇴근런클럽/ })).toBeTruthy();
    expect(screen.queryByText('번치를 불러오는 중이에요')).toBeNull();
    await waitFor(() => expect(toast).toHaveBeenCalledWith('퇴근런클럽 번치로 전환했어요.'));
    // 서버의 기본 번치가 바뀌어 다른 화면(사진함·번들 만들기)도 새 번치를 봄
    expect((await getMyBunches()).defaultBunchId).toBe(MOCK_SECOND_BUNCH_ID);
  });

  it('저장은 됐는데 새 번치 홈 미리 받기만 실패하면 전환 성공으로 알리고 새 번치 오류 화면에서 다시 받는다', async () => {
    // 새 번치 홈 요청만 실패(저장·기본 번치 변경은 성공)
    let failing = true;
    server.use(
      http.get(`/api/bunches/${MOCK_SECOND_BUNCH_ID}/home`, () =>
        failing ? fail(500, 'COMMON_500') : undefined,
      ),
    );
    const user = userEvent.setup();
    renderHome();

    const sheet = await openSwitcher(user);
    await user.click(await within(sheet).findByRole('button', { name: /퇴근런클럽/ }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('퇴근런클럽 번치로 전환했어요.'));
    expect(toast).not.toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요');
    expect((await getMyBunches()).defaultBunchId).toBe(MOCK_SECOND_BUNCH_ID);

    // 기본 번치는 새 번치라 이전 번치에 머물지 않고 새 번치의 오류 화면이 보임
    const retry = await screen.findByRole('button', { name: '다시 시도' });
    expect(screen.queryByRole('heading', { level: 1, name: /여행쥬아/ })).toBeNull();
    failing = false;
    await user.click(retry);

    expect(await screen.findByRole('heading', { level: 1, name: /퇴근런클럽/ })).toBeTruthy();
  });

  it('전환을 저장하지 못하면 지금 번치에 머물고 실패를 알린다', async () => {
    server.use(http.put('/api/bunches/:id/last-used', () => fail(500, 'COMMON_500')));
    const user = userEvent.setup();
    renderHome();

    const sheet = await openSwitcher(user);
    await user.click(await within(sheet).findByRole('button', { name: /퇴근런클럽/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(toast).not.toHaveBeenCalledWith('퇴근런클럽 번치로 전환했어요.');
    expect(screen.getByRole('heading', { level: 1, name: /여행쥬아/ })).toBeTruthy();
  });

  it('저장은 됐는데 기본 번치가 바뀌지 않으면 성공으로 알리지 않고 지금 번치에 머문다', async () => {
    // 서버가 마지막 사용 번치를 저장만 하고 기본 번치(members/me)는 그대로 두는 경우
    server.use(http.put('/api/bunches/:id/last-used', () => ok(null)));
    const user = userEvent.setup();
    renderHome();

    const sheet = await openSwitcher(user);
    await user.click(await within(sheet).findByRole('button', { name: /퇴근런클럽/ }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(toast).not.toHaveBeenCalledWith('퇴근런클럽 번치로 전환했어요.');
    expect(screen.getByRole('heading', { level: 1, name: /여행쥬아/ })).toBeTruthy();
  });

  it('접근 불가 번치의 「번치 목록에서 삭제」는 서버 안내를 지우고 목록에서 뺀다', async () => {
    const user = userEvent.setup();
    renderHome();

    const sheet = await openSwitcher(user);
    await user.click(await within(sheet).findByRole('button', { name: /홍대역/ }));
    const dialog = await screen.findByRole('alertdialog', { name: '홍대역 번치가 삭제됐어요' });
    await user.click(within(dialog).getByRole('button', { name: '번치 목록에서 삭제' }));

    await waitFor(() => expect(within(sheet).queryByRole('button', { name: /홍대역/ })).toBeNull());
    // 서버에서도 지워져 다시 받아도 보이지 않음
    expect((await getMyBunches()).unavailableBunches.map((notice) => notice.name)).toEqual([
      '큐시즘 맛집',
    ]);
  });

  it('소속 번치가 최대 개수면 「새로운 번치 추가하기」는 이동하지 않고 한도를 알린다', async () => {
    server.use(
      http.get('/api/members/me/bunches', () =>
        ok({
          activeCount: 10,
          maxActiveCount: 10,
          defaultBunchId: 1,
          activeBunches: [],
          unavailableBunches: [],
        }),
      ),
    );
    const user = userEvent.setup();
    renderHome();

    const sheet = await openSwitcher(user);
    await user.click(within(sheet).getByRole('button', { name: '새로운 번치 추가하기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('참여할 수 있는 번치는 최대 10개예요.'));
    expect(push).not.toHaveBeenCalledWith(BUNCH_HOME_PATHS.startBunch);
  });
});

// 보던 번치가 삭제됐거나 내보내짐(5.2.3 상세 동작 4): 받아 둔 기본 번치로 홈을 다시 받다 `409 BUNCH_008`
describe('BunchHome 보던 번치에 들어갈 수 없게 됨', () => {
  const NOTICE_ID = 30;
  // 홈을 본 뒤 내가 여행쥬아에서 내보내지고, 홈만 다시 받음(기본 번치는 아직 받아 둔 여행쥬아)
  const removeMeAndRefetchHome = async (client: ReturnType<typeof renderHome>) => {
    await screen.findByRole('heading', { name: /여행쥬아/ });
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => !(item.bunchId === MOCK_BUNCH_ID && item.memberId === MOCK_MEMBER_IDS.me),
      ),
      bunchAccessNotices: [
        ...state.bunchAccessNotices,
        {
          id: NOTICE_ID,
          bunchId: MOCK_BUNCH_ID,
          name: '여행쥬아',
          characterType: 'TYPE_1',
          reason: 'REMOVED',
          occurredAt: '2026-11-16T09:00:00.000Z',
        },
      ],
    }));
    await act(() =>
      client.invalidateQueries({ queryKey: sharedKeys.bunchHome(String(MOCK_BUNCH_ID)) }),
    );
  };

  it('내보내졌다는 안내를 띄우고, 「번치 목록에서 삭제」하면 안내를 지우고 최근 번치로 바뀐다', async () => {
    const user = userEvent.setup();
    const client = renderHome();
    await removeMeAndRefetchHome(client);

    const dialog = await screen.findByRole('alertdialog', {
      name: '여행쥬아 번치에서 내보내졌어요',
    });
    expect(
      within(dialog).getByText('번치 멤버 목록에서 제외되어 더 이상 번치에 참여할 수 없어요.'),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '번치 목록에서 삭제' }));

    expect(await screen.findByRole('heading', { name: /퇴근런클럽/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(mockDb.get().bunchAccessNotices.some((notice) => notice.id === NOTICE_ID)).toBe(false),
    );
  });

  it('안내를 띄우는 동안 화면 전체 로딩을 함께 두지 않는다(앱 스플래시가 안내 창을 가린 채 남지 않게)', async () => {
    const client = renderHome();
    await removeMeAndRefetchHome(client);

    await screen.findByRole('alertdialog', { name: '여행쥬아 번치에서 내보내졌어요' });
    expect(getPageLoadingCount()).toBe(0);
  });

  it('안내를 그냥 닫아도 최근 번치로 바뀌고, 안내는 전환 목록의 접근 불가 줄로 남는다', async () => {
    const user = userEvent.setup();
    const client = renderHome();
    await removeMeAndRefetchHome(client);

    await screen.findByRole('alertdialog', { name: '여행쥬아 번치에서 내보내졌어요' });
    await user.keyboard('{Escape}');

    expect(await screen.findByRole('heading', { name: /퇴근런클럽/ })).toBeInTheDocument();
    expect(mockDb.get().bunchAccessNotices.some((notice) => notice.id === NOTICE_ID)).toBe(true);
  });

  it('안내를 받지 못해도 멈추지 않고 최근 번치로 바뀐다', async () => {
    server.use(
      http.get('/api/members/me/bunch-access-notices/:noticeId', () => fail(404, 'RESOURCE_001')),
    );
    const client = renderHome();
    await removeMeAndRefetchHome(client);

    expect(await screen.findByRole('heading', { name: /퇴근런클럽/ })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('안내 뒤 다시 받아도 같은 번치를 볼 수 없으면 멈추지 않고 다시 시도할 수 있다', async () => {
    // 서버가 기본 번치를 다시 고르지 않는 경우(여행쥬아 홈만 계속 접근 불가)
    server.use(
      http.get('/api/bunches/:bunchId/home', () =>
        fail(409, 'BUNCH_008', { noticeId: 1, reason: 'DELETED' }),
      ),
    );
    const user = userEvent.setup();
    renderHome();

    await user.keyboard('{Escape}');
    const dialog = await screen.findByRole('alertdialog', { name: '홍대역 번치가 삭제됐어요' });
    await user.click(within(dialog).getByRole('button', { name: '번치 목록에서 삭제' }));

    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('남은 소속 번치가 없으면 안내 뒤 번치 없음 화면이다', async () => {
    const user = userEvent.setup();
    const client = renderHome();
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => !(item.bunchId === MOCK_SECOND_BUNCH_ID && item.memberId === MOCK_MEMBER_IDS.me),
      ),
    }));
    await removeMeAndRefetchHome(client);

    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '번치 목록에서 삭제',
      }),
    );

    expect(await screen.findByRole('button', { name: '새 번치 만들기' })).toBeInTheDocument();
  });
});
