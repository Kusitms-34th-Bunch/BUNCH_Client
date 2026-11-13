import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getMyProfile } from '@/shared/api/myProfile';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { OtherBunch } from './OtherBunch';
import { OtherBunchMembers } from './OtherBunchMembers';

// 내 번치(여행쥬아)가 다른 번치 3·4를 팔로우한 관계(시작 데이터의 목록용 관계는 제외)
const myExternalFollows = () =>
  mockDb
    .get()
    .follows.filter(
      (follow) =>
        follow.followerBunchId === MOCK_BUNCH_ID &&
        (follow.targetBunchId === 3 || follow.targetBunchId === 4),
    );

const back = vi.fn();
const replace = vi.fn();
const notFound = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace }), notFound }));

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
// 단언이 실패해도 요청 기록 listener가 다음 테스트로 넘어가지 않게
afterEach(() => {
  server.events.removeAllListeners();
});

const renderOther = (bunchId: string) =>
  render(<OtherBunch bunchId={bunchId} />, {
    wrapper: createQueryWrapper(createTestQueryClient()),
  });
const followerText = () => screen.getByText('팔로워').parentElement;

describe('OtherBunch 공개 번치(가짜 서버)', () => {
  it('팔로우하면 서버에 반영돼 「팔로잉」·팔로워 +1이 되고, 시트에서 팔로우를 취소한다', async () => {
    const user = userEvent.setup();
    renderOther('3');

    expect(await screen.findByRole('heading', { level: 1, name: '캠핑러버' })).toBeInTheDocument();
    expect(followerText()).toHaveTextContent('23팔로워');
    // 공개 번치는 팔로우 전에도 서버의 공개 번들이 보임
    const bundles = screen.getByRole('region', { name: '번들' });
    expect(
      await within(bundles).findByRole('img', { name: '가평 첫 캠핑 🏕️' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '팔로우' }));
    expect(await screen.findByRole('button', { name: '팔로잉' })).toBeInTheDocument();
    await waitFor(() => expect(followerText()).toHaveTextContent('24팔로워'));
    expect(screen.getByRole('status')).toHaveTextContent('캠핑러버 번치를 팔로우했어요.');
    expect(myExternalFollows()).toMatchObject([{ targetBunchId: 3, status: 'FOLLOWING' }]);

    await user.click(screen.getByRole('button', { name: '팔로잉' }));
    const sheet = await screen.findByRole('dialog', { name: '캠핑러버 팔로우를 취소할까요?' });
    expect(within(sheet).getByText('공개 번치')).toBeInTheDocument();
    // 시트의 번치 이미지는 번치 기본 이미지로 채워짐(빈 원이 아님)
    expect(sheet.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringMatching(/^\/images\/default-bunch\/type-\d\.svg$/),
    );
    await user.click(within(sheet).getByRole('button', { name: '팔로우 취소' }));

    expect(await screen.findByRole('button', { name: '팔로우' })).toBeInTheDocument();
    await waitFor(() => expect(followerText()).toHaveTextContent('23팔로워'));
    expect(screen.getByRole('status')).toHaveTextContent('캠핑러버 번치 팔로우를 취소했어요.');
    expect(myExternalFollows()).toEqual([]);
  });

  it('시트의 「취소」는 팔로우 상태를 그대로 둔다', async () => {
    const user = userEvent.setup();
    renderOther('3');

    await user.click(await screen.findByRole('button', { name: '팔로우' }));
    await user.click(await screen.findByRole('button', { name: '팔로잉' }));
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: '취소' }));

    expect(screen.getByRole('button', { name: '팔로잉' })).toBeInTheDocument();
    expect(myExternalFollows()).toHaveLength(1);
  });

  it('팔로우하지 못하면 안내하고 상태를 바꾸지 않는다', async () => {
    server.use(
      http.put('/api/bunches/:viewerId/following/:targetId', () => fail(500, 'COMMON_500')),
    );
    const user = userEvent.setup();
    renderOther('3');

    await user.click(await screen.findByRole('button', { name: '팔로우' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.followFailed));
    expect(screen.getByRole('button', { name: '팔로우' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('헤더에 알림은 없고 더보기만 있다', async () => {
    renderOther('3');

    expect(await screen.findByRole('button', { name: /더보기/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '알림' })).not.toBeInTheDocument();
  });

  it('볼 수 있는 번치는 팔로워·팔로잉 수가 목록 링크이고, 멤버 수는 글자만이다', async () => {
    renderOther('3');

    await screen.findByRole('heading', { level: 1, name: '캠핑러버' });
    expect(screen.getByRole('link', { name: /팔로워/ })).toHaveAttribute(
      'href',
      BUNCH_HOME_PATHS.otherBunchFollows('3'),
    );
    expect(screen.getByRole('link', { name: /팔로잉/ })).toHaveAttribute(
      'href',
      `${BUNCH_HOME_PATHS.otherBunchFollows('3')}?tab=following`,
    );
    expect(screen.queryByRole('link', { name: /멤버/ })).toBeNull();
    expect(screen.getByText('멤버').parentElement).toHaveTextContent('4멤버');
  });
});

describe('OtherBunch 비공개 번치(가짜 서버)', () => {
  it('팔로우 전에는 번들 대신 안내를 보이고, 팔로우하면 요청 상태로 바뀌며 요청을 취소할 수 있다', async () => {
    const requests: string[] = [];
    server.events.on('request:start', ({ request }) => {
      requests.push(new URL(request.url).pathname);
    });
    const user = userEvent.setup();
    renderOther('4');

    expect(await screen.findByRole('region', { name: '비공개 번치예요' })).toBeInTheDocument();
    expect(followerText()).toHaveTextContent('32팔로워');
    // 볼 수 없는 목록은 링크가 아님
    expect(screen.queryByRole('link', { name: /팔로워|팔로잉/ })).toBeNull();
    expect(screen.queryByRole('region', { name: '번들' })).toBeNull();
    // 볼 수 없는 번들은 요청하지 않음
    expect(requests).not.toContain('/api/bunches/4/published-bundles');

    await user.click(screen.getByRole('button', { name: '팔로우' }));
    expect(await screen.findByRole('button', { name: '팔로우 요청됨' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('책방산책 번치에 팔로우를 요청했어요.');
    // 요청만 보낸 상태라 여전히 가림
    expect(screen.getByRole('heading', { name: '비공개 번치예요' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '팔로우 요청됨' }));
    const sheet = await screen.findByRole('dialog', { name: '책방산책 팔로우 요청을 취소할까요?' });
    expect(within(sheet).getByText('요청 대기 중인 비공개 번치')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: '팔로우 요청 취소' }));

    expect(await screen.findByRole('button', { name: '팔로우' })).toBeInTheDocument();
    expect(myExternalFollows()).toEqual([]);
  });

  it('팔로우가 승인된 비공개 번치는 번들을 보인다', async () => {
    mockDb.update((state) => ({
      ...state,
      follows: [
        {
          id: 1,
          followerBunchId: MOCK_BUNCH_ID,
          targetBunchId: 4,
          status: 'FOLLOWING',
          createdAt: '2026-10-01T09:00:00.000Z',
        },
      ],
    }));
    renderOther('4');

    const bundles = await screen.findByRole('region', { name: '번들' });
    expect(
      await within(bundles).findByRole('img', { name: '노을 지는 동네 책방 투어' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '팔로잉' })).toBeInTheDocument();
  });
});

describe('OtherBunch 명의 확인', () => {
  it('서버가 본 명의가 다시 받은 기본 번치와 계속 다르면 팔로우를 막아 두지 않고 다시 시도 화면을 보인다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/home', () =>
        ok({
          bunch: {
            id: 3,
            name: '캠핑러버',
            imageUrl: null,
            characterType: 'TYPE_2',
            visibility: 'PUBLIC',
            introduction: '',
          },
          myMembership: null,
          permissions: {
            canEditProfile: false,
            canDeleteBunch: false,
            canManageRoles: false,
            canTransferOwner: false,
            canBlock: true,
            canInvite: false,
            canLeave: false,
          },
          memberCount: 4,
          followerCount: 23,
          followingCount: 8,
          stage: 1,
          accessScope: 'EXTERNAL',
          followState: 'NONE',
          followId: null,
          canViewBundles: true,
          currentBunchId: MOCK_SECOND_BUNCH_ID,
          isCurrentBunch: false,
        }),
      ),
    );
    renderOther('3');

    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });
});

describe('OtherBunch 주소 처리', () => {
  it('없는 번치와 잘못된 주소는 404로 보낸다', async () => {
    renderOther('999');
    await waitFor(() => expect(notFound).toHaveBeenCalled());

    notFound.mockClear();
    renderOther('__proto__');
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it('지금 번치의 주소면 번치 탭으로 보낸다', async () => {
    renderOther(String(MOCK_BUNCH_ID));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home));
    expect(toastAfterNavigation).not.toHaveBeenCalled();
  });

  it('내가 속한 다른 번치면 그 번치로 전환한 뒤 번치 탭으로 보낸다', async () => {
    renderOther(String(MOCK_SECOND_BUNCH_ID));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home));
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.switched('퇴근런클럽'));
    expect((await getMyProfile()).bunch?.id).toBe(String(MOCK_SECOND_BUNCH_ID));
  });
});

describe('OtherBunchMembers', () => {
  // 차단 여부를 서버 차단 목록으로 확인하므로 QueryClient와 함께 그리고 확인이 끝나기를 기다림
  const renderMembers = (bunchId: string) =>
    render(<OtherBunchMembers bunchId={bunchId} />, {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

  it('그 번치의 멤버를 서버 순서(관리자 먼저)로 관리 동작 없이 보여 준다', async () => {
    renderMembers('3');

    expect(
      await screen.findByRole('heading', { level: 1, name: '캠핑러버 멤버' }),
    ).toBeInTheDocument();
    const items = await screen.findAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('솔'),
      expect.stringContaining('도윤'),
      expect.stringContaining('서아'),
      expect.stringContaining('하람'),
    ]);
    expect(screen.queryByRole('button', { name: /관리|더보기/ })).toBeNull();
  });

  it('팔로우 승인 전의 비공개 번치는 명단을 요청하지 않고 안내를 보인다', async () => {
    const requests: string[] = [];
    const record = ({ request }: { request: Request }) => {
      requests.push(new URL(request.url).pathname);
    };
    server.events.on('request:start', record);
    renderMembers('4');

    expect(await screen.findByRole('region', { name: '비공개 번치예요' })).toHaveTextContent(
      '목록을 보려면 이 번치를 팔로우하세요.',
    );
    server.events.removeListener('request:start', record);
    expect(screen.queryByRole('listitem')).toBeNull();
    expect(requests).not.toContain('/api/bunches/4/members');
  });

  it('팔로우가 승인된 비공개 번치는 명단을 보인다', async () => {
    mockDb.update((state) => ({
      ...state,
      follows: [
        ...state.follows,
        {
          id: 999,
          followerBunchId: MOCK_BUNCH_ID,
          targetBunchId: 4,
          status: 'FOLLOWING',
          createdAt: '2026-10-20T09:00:00.000Z',
        },
      ],
    }));
    renderMembers('4');

    expect(await screen.findAllByRole('listitem')).toHaveLength(6);
  });

  it('명단 조회가 403이면(그사이 비공개로 바뀜) 잠금 안내를 보인다', async () => {
    server.use(http.get('/api/bunches/:bunchId/members', () => fail(403, 'AUTH_002')));
    renderMembers('3');

    expect(await screen.findByRole('region', { name: '비공개 번치예요' })).toBeInTheDocument();
  });

  it.each([
    ['명단이 404(그사이 차단·삭제)', '/api/bunches/:bunchId/members', 404, 'BUNCH_009'],
    ['명단이 409(접근 불가 안내)', '/api/bunches/:bunchId/members', 409, 'BUNCH_008'],
    ['번치 홈이 409(접근 불가 안내)', '/api/bunches/:bunchId/home', 409, 'BUNCH_008'],
  ])('%s면 다시 시도 없이 접근 제한 화면을 보인다', async (_name, path, status, code) => {
    server.use(http.get(path, () => fail(status, code)));
    renderMembers('3');

    expect(await screen.findByRole('heading', { name: '볼 수 없는 번치예요' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('명단 조회가 실패하면 다시 시도로 다시 받는다', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/bunches/:bunchId/members', () => fail(500, 'X'), { once: true }));
    renderMembers('3');

    await user.click(await screen.findByRole('button', { name: '다시 시도' }));

    expect(await screen.findAllByRole('listitem')).toHaveLength(4);
  });

  it('없는 번치와 상속 속성 이름은 404로 보낸다', async () => {
    renderMembers('constructor');
    await waitFor(() => expect(notFound).toHaveBeenCalled());
    notFound.mockClear();

    renderMembers('9999');
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });
});
