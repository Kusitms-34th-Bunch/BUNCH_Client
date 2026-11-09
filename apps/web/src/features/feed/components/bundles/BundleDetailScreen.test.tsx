import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { likeStore } from '../../lib/likeStore';
import { BundleDetailScreen } from './BundleDetailScreen';

const push = vi.fn();
const toast = vi.fn();
// 테스트 환경은 이미지 import가 next와 달라 StaticImageData 모양으로 대체
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const links = { bunchHome: '/bunch', otherBunch: (id: string) => `/bunches/${id}` };

type RenderOptions = { bunch?: { id: string; name: string } | null; focusComments?: boolean };

const renderDetail = (
  bundleId = 'bundle-1',
  { bunch = { id: 'bunch-trip', name: '여행가조' }, focusComments = false }: RenderOptions = {},
) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<BundleDetailScreen bundleId={bundleId} focusComments={focusComments} links={links} />, {
    wrapper: createQueryWrapper(client),
  });
};

beforeEach(() => {
  push.mockClear();
  likeStore.clear();
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
    renderDetail('bundle-2');

    const first = screen.getByRole('button', { name: /^참여 멤버 3명/ }).querySelector('img');
    expect(first?.getAttribute('src')).toContain('deleted-user');
  });

  it('제목·멤버 공개 뱃지·사진·댓글을 보여 주고, 입력란에 지금 번치 이름이 들어간다', () => {
    renderDetail();

    expect(
      screen.getByRole('heading', { level: 1, name: '제주 3박4일 여행 아카이빙' }),
    ).toBeTruthy();
    expect(screen.getByRole('img', { name: '멤버 공개' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '1 / 4' })).toBeTruthy();
    // fixture의 셋째 사진은 1명이라 버튼이 아님
    expect(screen.getAllByRole('button', { name: /^pick / })).toHaveLength(2);
    expect(screen.getByRole('img', { name: /^pick / })).toBeTruthy();
    const comments = within(screen.getByRole('region', { name: '댓글' }));
    expect(comments.getAllByRole('listitem')).toHaveLength(4);
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
    expect(leftChip.querySelector('img')?.getAttribute('src')).toContain('deleted-user');
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
    renderDetail('bundle-2');
    await user.click(screen.getByRole('button', { name: /책방산책/ }));
    expect(push).toHaveBeenLastCalledWith('/bunches/bunch-book');
  });

  it('답글을 누르면 답글 작성 상태가 되고 닫기로 돌아온다', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: '수인님 댓글의 답글 1개' }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
    expect(
      screen.getByRole('textbox', { name: /수인님에게 답글, 여행가조로 답글 달기/ }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '답글 그만 쓰기' }));
    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('좋아요는 수와 함께 바뀐다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-2');
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveAccessibleName('좋아요 5');
  });

  it('소속 번치가 없으면 입력 안내에 번치 이름이 없고, 번치 명의 행동은 토스트로 막는다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-3', { bunch: null });

    expect(screen.getByRole('textbox', { name: '댓글 달기' })).toBeTruthy();
    const like = screen.getByRole('button', { name: /좋아요/ });
    await user.click(like);
    expect(like).toHaveAttribute('aria-pressed', 'false');
    // 입력란을 가리지 않게 헤더 아래
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', { position: 'top' });
  });

  it('말풍선을 누르면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderDetail();

    await user.click(screen.getByRole('button', { name: /^댓글/ }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('삭제된 댓글은 기본 프로필 이미지를 보인다', () => {
    renderDetail();
    const comments = within(screen.getByRole('region', { name: '댓글' })).getAllByRole('listitem');
    const images = comments.map((item) => item.querySelector('img')?.getAttribute('src') ?? '');

    expect(images.filter((src) => src.includes('deleted-user'))).toHaveLength(2);
  });

  it('댓글이 없으면 빈 안내를 보인다', () => {
    renderDetail('bundle-2');
    expect(screen.getByText('아직 작성된 댓글이 없어요')).toBeTruthy();
  });

  it('?focus=comments로 들어오면 댓글 영역으로 스크롤하고 입력란에 초점을 둔다', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderDetail('bundle-1', { focusComments: true });

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('스크롤한 채 화면을 떠나면 나가는 화면이 튀지 않게 스크롤을 transform으로 옮긴다', () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: null });
    const { container, unmount } = render(
      <BundleDetailScreen bundleId="bundle-1" focusComments={false} links={links} />,
      { wrapper: createQueryWrapper(client) },
    );
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

  it('없는 번들이면 볼 수 없다는 안내와 뒤로 가기만 있다', () => {
    renderDetail('nope');

    expect(
      screen.getByRole('heading', { level: 1, name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

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

    await user.click(screen.getByRole('button', { name: '수인님 댓글의 답글 1개' }));
    await user.type(input(), '답글이에요');
    await user.click(send());

    expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull();
    expect(screen.getByRole('button', { name: '수인님 댓글의 답글 2개' })).toBeTruthy();
    // 원댓글(2번째) 아래 기존 답글 다음
    expect(within(items()[3]!).getByText('답글이에요')).toBeTruthy();
  });

  it('내 댓글은 더보기 → 「삭제」 → 확인 뒤 「삭제된 댓글입니다」로 바뀌고 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    renderDetail();
    const mores = screen.getAllByRole('button', { name: /댓글 더보기/ });
    // fixture에서 내 댓글은 하나뿐(남의 댓글 신고는 구현 단위 5)
    expect(mores).toHaveLength(1);

    await user.click(mores[0]!);
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog', { name: '댓글을 삭제할까요?' });
    expect(within(dialog).getByText('데이터가 삭제되며 복구 불가능해요.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('댓글을 삭제했어요', { position: 'top' }),
    );
    expect(screen.queryAllByRole('button', { name: /댓글 더보기/ })).toHaveLength(0);
    expect(screen.getAllByText('삭제된 댓글입니다')).toHaveLength(3);
  });

  it('답글을 쓰던 댓글을 지우면 답글 상태가 풀린다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-3');
    await user.type(screen.getByRole('textbox', { name: /달기/ }), '내 댓글');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    await user.click(screen.getByRole('button', { name: /댓글에 답글 달기/ }));
    expect(screen.getByText('님에게 답글 남기는 중')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /댓글 더보기/ }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(screen.queryByText('님에게 답글 남기는 중')).toBeNull());
    expect(screen.getByRole('listitem', { name: '삭제된 댓글' })).toHaveFocus();
    expect(toast).toHaveBeenCalledWith('댓글을 삭제했어요', { position: 'top' });
  });

  it('삭제 확인 창의 「취소」는 댓글을 그대로 둔다', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole('button', { name: /댓글 더보기/ }));
    await user.click(await screen.findByRole('button', { name: '삭제' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('button', { name: /댓글 더보기/ })).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
  });

  it('보내기를 연타해도 한 번만 등록한다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-3');

    await user.type(screen.getByRole('textbox', { name: /달기/ }), '한 번');
    await user.dblClick(screen.getByRole('button', { name: '보내기' }));

    expect(screen.getAllByText('한 번')).toHaveLength(1);
  });

  it('소속 번치가 없으면 댓글을 등록하지 않고 안내한다', async () => {
    const user = userEvent.setup();
    renderDetail('bundle-3', { bunch: null });

    await user.type(screen.getByRole('textbox', { name: '댓글 달기' }), '안녕');
    await user.click(screen.getByRole('button', { name: '보내기' }));

    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', { position: 'top' });
    expect(screen.getByText('아직 작성된 댓글이 없어요')).toBeTruthy();
  });
});
