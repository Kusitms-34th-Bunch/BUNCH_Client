import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { BundleBunchSource, BundleDetailResponse } from '../../model/bundleDetail';
import { bundleEdits } from '../../lib/bundleEdits';
import { likeStore } from '../../lib/likeStore';
import { bundleDetailKeys } from '../../queries/bundleDetail';
import { BundleDetailScreen } from './BundleDetailScreen';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back, replace }),
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const links = { bunchHome: '/bunch', otherBunch: (id: string) => `/bunches/${id}` };

// 발행 번들 상세 응답(Swagger BunchPublicBundleDetail)
const person = (memberId: number, nickname: string, available = true) => ({
  memberId,
  nickname: available ? nickname : '작성자',
  imageUrl: null,
  profileAvailable: available,
});
const LONG_COMMENT =
  '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 하루 종일 책상 앞에 앉아 있다가 밖으로 나오니 선선한 바람부터 기분 좋게 느껴졌다.';
const pickers = (count: number) =>
  Array.from({ length: count }, (_, index) => person(index + 10, `멤버 ${index + 1}`));
const base = {
  date: '2026-07-09',
  publishedAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
  locations: [] as BundleDetailResponse['locations'],
  visibility: 'PUBLIC' as const,
  likeCount: 4,
  likedByCurrentBunch: false,
  commentCount: 0,
};
const MANAGE = { canEdit: true, canDelete: true, canReport: false };
const REPORT = { canEdit: false, canDelete: false, canReport: true };
const photos = (picks: number[]) =>
  picks.map((count, index) => ({
    id: index + 1,
    imageUrl: `/mock/photos/P${index + 1}.jpg`,
    position: index,
    picks: { members: pickers(count) },
  }));

// 1: 우리 번치(1) 번들, 메인 관리자, 멤버 공개·댓글 수 4 / 2: 비공개 번치(4) 번들, 첫 멤버는 나감 / 3: 공개 번치(3) 번들
const DETAILS: Record<string, BundleDetailResponse> = {
  '1': {
    ...base,
    id: 1,
    bunchId: 1,
    title: '제주 3박4일 여행 아카이빙',
    photos: photos([8, 2, 1, 0]),
    locations: [
      { id: 11, name: '애월 한담해변', address: '제주시 애월읍', position: 0 },
      { id: 12, name: '한라산', address: null, position: 1 },
    ],
    contributors: [...[1, 2, 3, 4, 5, 6].map((n) => person(n, `멤버 ${n}`)), person(7, '', false)],
    comments: [
      { ...person(1, '은우'), id: 101, content: LONG_COMMENT },
      { ...person(2, '경진'), id: 102, content: '바다 보면서 먹은 갈치조림이 최고였어요.' },
      { ...person(3, '수인'), id: 103, content: '다음에는 우도까지 가 봐요!' },
      { ...person(4, '', false), id: 104, content: '삭제된 코멘트입니다' },
    ],
    visibility: 'PRIVATE',
    permissions: MANAGE,
    likedByCurrentBunch: true,
    commentCount: 4,
  },
  '2': {
    ...base,
    id: 2,
    bunchId: 4,
    title: '노을 지는 동네 책방 투어',
    photos: photos([0]),
    contributors: [person(8, '', false), person(1, '멤버 1'), person(2, '멤버 2')],
    comments: [],
    permissions: REPORT,
  },
  '3': {
    ...base,
    id: 3,
    bunchId: 3,
    title: '여름밤 바닷가 캠핑',
    photos: photos([0]),
    contributors: [person(1, '멤버 1')],
    comments: [],
    permissions: REPORT,
  },
};
const BUNCHES: Record<string, BundleBunchSource> = {
  '1': { id: 1, name: '여행가조', characterType: 'TYPE_3' },
  '3': { id: 3, name: '캠핑러버', characterType: 'TYPE_2' },
  '4': { id: 4, name: '책방산책', characterType: 'TYPE_1' },
};

type RenderOptions = { viewer?: { id: string; name: string } | null; focusComments?: boolean };

/** 상세 응답을 캐시에 넣고 그림. 없는 번들 ID는 서버 응답(404)을 기다림 */
const renderDetail = (
  bundleId = '1',
  { viewer = { id: '1', name: '여행가조' }, focusComments = false }: RenderOptions = {},
) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: viewer });
  const detail = DETAILS[bundleId];
  const bunchId = String(detail?.bunchId ?? 1);
  if (detail) {
    client.setQueryData(bundleDetailKeys.detail(bunchId, bundleId, viewer?.id ?? null), detail);
  }
  return render(
    <BundleDetailScreen
      bunchId={bunchId}
      bundleId={bundleId}
      bunch={BUNCHES[bunchId]}
      focusComments={focusComments}
      links={links}
    />,
    { wrapper: createQueryWrapper(client) },
  );
};

/** 입력란에 댓글을 써서 등록(소셜 댓글 목록은 API 연동 4번 전이라 비어 있음) */
const addComment = async (user: ReturnType<typeof userEvent.setup>, content: string) => {
  await user.type(screen.getByRole('textbox', { name: /달기/ }), content);
  await user.click(screen.getByRole('button', { name: '보내기' }));
};

beforeEach(() => {
  push.mockClear();
  back.mockClear();
  replace.mockClear();
  likeStore.clear();
  bundleEdits.clear();
  toast.mockClear();
});

describe('BundleDetailScreen', () => {
  it('위치와 참여 멤버를 누르면 각 시트가 열린다', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: /^위치/ }));
    expect(await screen.findByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(screen.getByText('애월 한담해변')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull(),
    );

    await user.click(screen.getByRole('button', { name: /^참여 멤버 \d+명/ }));
    const sheet = await screen.findByRole('dialog', { name: '참여 멤버' });
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(7);
    expect(within(sheet).getByText('작성자')).toBeTruthy();
  });

  it('나간 멤버의 얼굴은 원래 이미지 대신 기본 이미지다', () => {
    renderDetail('2');

    const first = screen.getByRole('button', { name: /^참여 멤버 3명/ }).querySelector('img');
    expect(first?.getAttribute('src')).toBe(DEFAULT_PROFILE_IMAGE);
  });

  it('제목·멤버 공개 뱃지·사진·장소·날짜를 보여 주고, 입력란에 지금 번치 이름이 들어간다', () => {
    renderDetail();

    expect(
      screen.getByRole('heading', { level: 1, name: '제주 3박4일 여행 아카이빙' }),
    ).toBeTruthy();
    expect(screen.getByRole('img', { name: '멤버 공개' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '1 / 4' })).toBeTruthy();
    // 셋째 사진은 pick 1명이라 버튼이 아님
    expect(screen.getAllByRole('button', { name: /^pick / })).toHaveLength(2);
    expect(screen.getByRole('img', { name: /^pick / })).toBeTruthy();
    expect(screen.getByText('애월 한담해변 외 1곳')).toBeTruthy();
    expect(screen.getByText('2026년 7월 9일')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: '여행가조로 댓글 달기' })).toBeTruthy();
  });

  it('멤버 칩을 고르면 그 멤버의 코멘트, 나간 멤버는 「작성자」와 삭제 안내', async () => {
    const user = userEvent.setup();
    renderDetail();
    const region = within(screen.getByRole('region', { name: '멤버별 코멘트' }));

    expect(region.getByRole('button', { name: '은우' })).toHaveAttribute('aria-pressed', 'true');
    expect(region.getByText(/퇴근하고 뛰는 게/)).toBeTruthy();

    await user.click(region.getByRole('button', { name: '경진' }));
    expect(region.getByText(/갈치조림/)).toBeTruthy();
    expect(region.queryByText(/퇴근하고 뛰는 게/)).toBeNull();

    const leftChip = region.getByRole('button', { name: '작성자' });
    expect(leftChip.querySelector('img')?.getAttribute('src')).toBe(DEFAULT_PROFILE_IMAGE);
    await user.click(leftChip);
    expect(region.getByText('삭제된 코멘트입니다')).toBeTruthy();
  });

  it('번치를 누르면 지금 번치면 번치 탭, 아니면 다른 번치 프로필로 간다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole('button', { name: /여행가조/ }));
    expect(push).toHaveBeenLastCalledWith('/bunch');
  });

  it('다른 번치의 번들에서 번치를 누르면 다른 번치 프로필로 간다', async () => {
    const user = userEvent.setup();
    renderDetail('2');
    await user.click(screen.getByRole('button', { name: /책방산책/ }));
    expect(push).toHaveBeenLastCalledWith('/bunches/4');
  });

  it('답글을 누르면 답글 작성 상태가 되고 닫기로 돌아온다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '내 댓글');

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    expect(
      screen.getByRole('textbox', { name: /나님에게 답글, 여행가조로 답글 달기/ }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '답글 그만 쓰기' }));
    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('좋아요는 수와 함께 바뀐다', async () => {
    const user = userEvent.setup();
    renderDetail('2');
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveAccessibleName('좋아요 5');
  });

  it('소속 번치가 없으면 입력 안내에 번치 이름이 없고, 번치 명의 행동은 토스트로 막는다', async () => {
    const user = userEvent.setup();
    renderDetail('3', { viewer: null });

    expect(screen.getByRole('textbox', { name: '댓글 달기' })).toBeTruthy();
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'false');
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
  });

  it('말풍선을 누르면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const user = userEvent.setup();
    renderDetail();
    const section = screen.getByRole('region', { name: '댓글' });
    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);

    await user.click(screen.getByRole('button', { name: /^댓글/ }));
    expect(section.closest('main')!.scrollTop).toBe(500);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('댓글이 없으면 빈 안내를 보인다', () => {
    renderDetail('2');
    expect(screen.getByText('아직 작성된 댓글이 없어요')).toBeTruthy();
  });

  it('?focus=comments로 들어오면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderDetail('1', { focusComments: true });
    const section = screen.getByRole('region', { name: '댓글' });
    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 500 } as DOMRect);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')));
    expect(section.closest('main')!.scrollTop).toBe(500);
    // 전환 중 바깥 틀을 가로로 밀지 않게 scrollIntoView를 쓰지 않음
    expect(scrollIntoView).not.toHaveBeenCalled();
    // jsdom에 원래 없는 메서드라 다음 테스트로 남지 않게 지움
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('스크롤한 채 화면을 떠나면 나가는 화면이 튀지 않게 스크롤을 transform으로 옮긴다', () => {
    const { container, unmount } = renderDetail('1', { viewer: null });
    const main = container.querySelector('main')!;
    const firstChild = main.firstElementChild as HTMLElement;
    main.scrollTop = 400;

    unmount();
    expect(main.scrollTop).toBe(0);
    expect(firstChild.style.transform).toBe('translateY(-400px)');
  });

  it('키보드가 올라와 보이는 높이가 줄면 입력란에 표식을 달고, 내려가면 뗀다', () => {
    const viewport = Object.assign(new EventTarget(), {
      height: window.innerHeight - 300,
      scale: 1,
    });
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    renderDetail();
    const composer = screen.getByRole('textbox').closest('[data-keyboard-open]');
    expect(composer).not.toBeNull();

    viewport.height = window.innerHeight;
    act(() => void viewport.dispatchEvent(new Event('resize')));
    expect(document.querySelector('[data-keyboard-open]')).toBeNull();
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
  });

  it.each([
    [404, 'RESOURCE_001'],
    [403, 'AUTH_002'],
    [400, 'COMMON_001'],
  ])(
    '서버가 %s(없음·볼 수 없음·잘못된 주소)이면 볼 수 없다는 안내와 뒤로 가기만 있다',
    async (status, code) => {
      server.use(
        http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () => fail(status, code)),
      );
      renderDetail('99');

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: '삭제되었거나 볼 수 없는 내용이에요',
        }),
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeTruthy();
      expect(screen.queryByRole('textbox')).toBeNull();
    },
  );

  it('댓글은 맨 위에, 답글은 그 댓글 아래에 등록하고 수와 「답글 N」을 올린다', async () => {
    const user = userEvent.setup();
    renderDetail();
    const input = () => screen.getByRole('textbox', { name: /달기/ });
    const send = () => screen.getByRole('button', { name: '보내기' });

    await user.type(input(), '   ');
    expect(send()).toBeDisabled();
    await user.clear(input());
    await user.type(input(), '  첫 댓글  ');
    await user.click(send());

    const items = () =>
      within(screen.getByRole('region', { name: '댓글' })).getAllByRole('listitem');
    expect(within(items()[0]!).getByText('첫 댓글')).toBeTruthy();
    expect(input()).toHaveValue('');
    expect(screen.getByRole('button', { name: /댓글 5/ })).toBeTruthy();
    await waitFor(() => expect(items()[0]).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('댓글을 등록했어요');

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    await user.type(input(), '답글이에요');
    await user.click(send());

    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(screen.getByRole('button', { name: '나님 댓글의 답글 1개' })).toBeTruthy();
    // 원댓글 아래
    expect(within(items()[1]!).getByText('답글이에요')).toBeTruthy();
  });

  it('내 댓글은 더보기 → 「삭제」 → 확인 뒤 「삭제된 댓글입니다」로 바뀌고 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '지울 댓글');
    await user.click(screen.getByRole('button', { name: '내 댓글 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog', { name: '댓글을 삭제할까요?' });
    expect(within(dialog).getByText('데이터가 삭제되며 복구 불가능해요.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('댓글을 삭제했어요'));
    expect(screen.queryByRole('button', { name: '내 댓글 더보기' })).toBeNull();
    expect(screen.getAllByText('삭제된 댓글입니다')).toHaveLength(1);
  });

  it('답글을 쓰던 댓글을 지우면 답글 상태가 풀린다', async () => {
    const user = userEvent.setup();
    renderDetail('3');
    await addComment(user, '내 댓글');

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '내 댓글 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull());
    expect(screen.getByRole('listitem', { name: '삭제된 댓글' })).toHaveFocus();
    expect(toast).toHaveBeenCalledWith('댓글을 삭제했어요');
  });

  it('삭제 확인 창의 「취소」는 댓글을 그대로 둔다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await addComment(user, '남길 댓글');

    await user.click(screen.getByRole('button', { name: '내 댓글 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('button', { name: '내 댓글 더보기' })).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  it('보내기를 연타해도 한 번만 등록한다', async () => {
    const user = userEvent.setup();
    renderDetail('3');

    await user.type(screen.getByRole('textbox', { name: /달기/ }), '한 번');
    await user.dblClick(screen.getByRole('button', { name: '보내기' }));

    expect(screen.getAllByText('한 번')).toHaveLength(1);
  });

  it('소속 번치가 없으면 댓글을 등록하지 않고 안내한다', async () => {
    const user = userEvent.setup();
    renderDetail('3', { viewer: null });

    await user.type(screen.getByRole('textbox', { name: '댓글 달기' }), '안녕');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.');
    expect(screen.getByText('아직 작성된 댓글이 없어요')).toBeTruthy();
  });

  it('다른 번치 번들은 헤더 더보기 → 「신고」 → 신고하면 이전 화면으로 가서 알린다', async () => {
    const user = userEvent.setup();
    renderDetail('2');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '신고' }));
    const sheet = await screen.findByRole('dialog', { name: '이 게시글을 신고할까요?' });
    await user.click(within(sheet).getByRole('radio', { name: '스팸' }));
    await user.click(within(sheet).getByRole('button', { name: '신고하기' }));

    await waitFor(() => expect(toastAfterNavigation).toHaveBeenCalledWith('신고가 접수됐어요.'));
    // 직접 들어온 경우(기록 없음)는 피드로 바꿔 들어감
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
  });

  it('소속 번치가 없으면 신고 시트를 열지 않고 안내한다', async () => {
    const user = userEvent.setup();
    renderDetail('2', { viewer: null });

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '신고' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.'));
    expect(screen.queryByRole('dialog', { name: '이 게시글을 신고할까요?' })).toBeNull();
  });

  it('메인 관리자는 헤더 더보기에서 공개 범위 설정으로 간다', async () => {
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    expect(await screen.findByRole('button', { name: '삭제하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '수정하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '신고' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '공개 범위 설정' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/bunches/1/bundles/1/visibility'));
  });

  it('메인 관리자가 번들을 삭제하면 이전 화면으로 가서 알린다', async () => {
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '게시글을 삭제할까요?' });
    expect(within(dialog).getByText('데이터가 삭제되며 복구 불가능해요.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(toastAfterNavigation).toHaveBeenCalledWith('번들을 삭제했어요'));
    expect(bundleEdits.read().deleted.has('1')).toBe(true);
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
  });

  it('삭제 확인 창의 「취소」는 번들을 그대로 둔다', async () => {
    const user = userEvent.setup();
    renderDetail('1');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    await user.click(await screen.findByRole('button', { name: '삭제하기' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '취소' }),
    );

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(bundleEdits.read().deleted.size).toBe(0);
    expect(toast).not.toHaveBeenCalled();
  });

  it('지운 번들에 다시 들어오면 볼 수 없다는 안내를 보인다', () => {
    bundleEdits.remove('2');
    renderDetail('2');
    expect(
      screen.getByRole('heading', { name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
  });

  it('공개 범위를 바꾸면 상세 뱃지에 반영된다', () => {
    bundleEdits.setMemberOnly('1', false);
    renderDetail('1');
    expect(screen.queryByRole('img', { name: '멤버 공개' })).toBeNull();
  });

  it('받는 동안은 불러오는 중을 알리고, 실패하면 다시 시도로 받는다', async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () =>
        failing ? fail(500, 'COMMON_999') : ok(DETAILS['3']),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    render(
      <BundleDetailScreen
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );

    expect(screen.getByRole('status')).toHaveTextContent('번들을 불러오는 중이에요');
    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');
    failing = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    // 버튼이 사라지면 번들 제목으로 초점
    const title = await screen.findByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' });
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('삭제 권한만 있으면 관리 메뉴에 「삭제하기」만 있다', async () => {
    const user = userEvent.setup();
    DETAILS['5'] = {
      ...DETAILS['3']!,
      id: 5,
      permissions: { canEdit: false, canDelete: true, canReport: false },
    };
    renderDetail('5');

    await user.click(screen.getByRole('button', { name: '번들 더보기' }));
    expect(await screen.findByRole('button', { name: '삭제하기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '공개 범위 설정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '수정하기' })).toBeNull();
  });

  it('수정·삭제 권한도 신고 권한도 없으면 헤더 더보기가 없다', () => {
    DETAILS['4'] = { ...DETAILS['3']!, id: 4, permissions: { ...REPORT, canReport: false } };
    renderDetail('4');
    expect(screen.queryByRole('button', { name: '번들 더보기' })).toBeNull();
  });

  it('번치 정보를 받지 못해도 내용은 보이고, 번치 버튼 이름은 「번치」다', () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: null });
    client.setQueryData(bundleDetailKeys.detail('3', '3', null), DETAILS['3']);
    render(
      <BundleDetailScreen
        bunchId="3"
        bundleId="3"
        bunch={null}
        focusComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );
    expect(screen.getByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^번치/ })).toBeTruthy();
  });

  it('이미 받은 상세가 있으면 다시 받기가 실패해도 보던 내용을 그대로 둔다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () => fail(500, 'COMMON_999')),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    const key = bundleDetailKeys.detail('3', '3', '1');
    client.setQueryData(key, DETAILS['3']);
    render(
      <BundleDetailScreen
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );

    await act(() => client.refetchQueries({ queryKey: key }));
    expect(client.getQueryState(key)?.status).toBe('error');
    expect(screen.getByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('다시 시도 결과가 볼 수 없음이면 초점을 안내 제목으로 옮긴다', async () => {
    const user = userEvent.setup();
    let status = 500;
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () =>
        fail(status, status === 404 ? 'RESOURCE_001' : 'COMMON_999'),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    render(
      <BundleDetailScreen
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(client) },
    );

    await screen.findByRole('alert');
    status = 404;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    const notice = await screen.findByRole('heading', {
      level: 1,
      name: '삭제되었거나 볼 수 없는 내용이에요',
    });
    await waitFor(() => expect(notice).toHaveFocus());
  });

  it('내 정보를 다시 받는 동안은 받는 중 화면으로 바뀐다', async () => {
    const user = userEvent.setup();
    let attempt = 0;
    server.use(
      http.get('/api/members/me', () => {
        attempt += 1;
        return attempt === 1 ? fail(500, 'COMMON_500') : new Promise<never>(() => {});
      }),
    );
    render(
      <BundleDetailScreen
        bunchId="3"
        bundleId="3"
        bunch={BUNCHES['3']}
        focusComments={false}
        links={links}
      />,
      { wrapper: createQueryWrapper(createTestQueryClient()) },
    );

    await user.click(await screen.findByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('status')).toHaveTextContent('번들을 불러오는 중이에요');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('번치 정보가 늦게 와도 ?focus=comments면 본문이 그려진 뒤 입력란에 초점을 둔다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    client.setQueryData(bundleDetailKeys.detail('3', '3', '1'), DETAILS['3']);
    const view = (bunch: BundleBunchSource | undefined) => (
      <BundleDetailScreen bunchId="3" bundleId="3" bunch={bunch} focusComments links={links} />
    );
    const { rerender } = render(view(undefined), { wrapper: createQueryWrapper(client) });
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));

    rerender(view(BUNCHES['3']));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
  });

  it('상세가 먼저 오고 번치 정보가 늦어도 다시 시도 뒤 초점을 번들 제목으로 옮긴다', async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () =>
        failing ? fail(500, 'COMMON_999') : ok(DETAILS['3']),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    const view = (bunch: BundleBunchSource | undefined) => (
      <BundleDetailScreen
        bunchId="3"
        bundleId="3"
        bunch={bunch}
        focusComments={false}
        links={links}
      />
    );
    const { rerender } = render(view(undefined), { wrapper: createQueryWrapper(client) });

    await screen.findByRole('alert');
    failing = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() =>
      expect(client.getQueryState(bundleDetailKeys.detail('3', '3', '1'))?.status).toBe('success'),
    );

    rerender(view(BUNCHES['3']));
    const title = await screen.findByRole('heading', { level: 1, name: '여름밤 바닷가 캠핑' });
    await waitFor(() => expect(title).toHaveFocus());
  });
});
