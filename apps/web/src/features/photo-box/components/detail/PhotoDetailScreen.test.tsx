import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PhotoBoxActions,
  PhotoBoxMember,
  PhotoBoxPhoto,
  PhotoBoxViewer,
  SaveResult,
} from '../../lib/types';
import { PHOTO_BOX_MESSAGES } from '../../constants/messages';
import { MissingPhotosError } from '../../lib/missingPhotos';
import { PhotoDetailScreen } from './PhotoDetailScreen';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

// 재생·제스처 라이브러리는 모양과 제스처를 검증하지 않으므로 mock하고 이벤트는 붙잡아 직접 호출
type SwiperLike = {
  activeIndex: number;
  slidePrev: () => void;
  slideNext: () => void;
  slideTo: (_index: number, _speed?: number) => void;
  update: () => void;
  keyboard: { enable: () => void; disable: () => void };
  zoom: { toggle: () => void };
};
type CapturedProps = {
  onSlideChange?: (_swiper: SwiperLike) => void;
  onZoomChange?: (_swiper: SwiperLike, _scale: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onSwiper?: (_swiper: SwiperLike) => void;
};
const swiper: SwiperLike = {
  activeIndex: 0,
  slidePrev: vi.fn(),
  slideNext: vi.fn(),
  slideTo: vi.fn(),
  update: vi.fn(),
  keyboard: { enable: vi.fn(), disable: vi.fn() },
  zoom: { toggle: vi.fn() },
};
let captured: CapturedProps = {};

vi.mock('swiper/react', () => ({
  Swiper: (props: CapturedProps & { children: ReactNode }) => {
    captured = props;
    props.onSwiper?.(swiper);
    return <div data-testid="swiper">{props.children}</div>;
  },
  SwiperSlide: ({
    children,
    ...props
  }: {
    children: ReactNode;
    'aria-hidden'?: boolean | undefined;
  }) => (
    <div data-testid="slide" {...props}>
      {children}
    </div>
  ),
}));
vi.mock('swiper/modules', () => ({ A11y: {}, Keyboard: {}, Zoom: {} }));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/zoom', () => ({}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const members: PhotoBoxMember[] = [
  { id: 'a', name: '은우' },
  { id: 'b', name: '경진' },
];

const photo = (
  id: string,
  takenAt: string | null,
  uploaderIds: string[],
  status: PhotoBoxPhoto['status'] = 'ready',
): PhotoBoxPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: `사진 ${id}`,
  takenAt,
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds,
  status,
});

const photos = [
  photo('p1', '2026-09-27T10:00', ['a']),
  photo('p2', '2026-09-27T09:00', ['a', 'b']),
  photo('p3', '2026-09-26T09:00', ['b']),
  photo('p4', null, ['a']),
  photo('p5', '2025-12-24T19:00', ['a']),
];

const admin: PhotoBoxViewer = { memberId: 'a', isAdmin: true };
const member: PhotoBoxViewer = { memberId: 'a', isAdmin: false };

const savePhotos = vi.fn<PhotoBoxActions['savePhotos']>();
const deletePhotos = vi.fn<PhotoBoxActions['deletePhotos']>();
const changePhotoDates = vi.fn<PhotoBoxActions['changePhotoDates']>();
const actions: PhotoBoxActions = { savePhotos, deletePhotos, changePhotoDates };

const onBack = vi.fn();
const onLeave = vi.fn();
const onPhotoChange = vi.fn();

const renderScreen = (
  props: Partial<React.ComponentProps<typeof PhotoDetailScreen>> = {},
  initialPhotoId = 'p1',
) =>
  render(
    <PhotoDetailScreen
      photos={photos}
      members={members}
      viewer={admin}
      initialPhotoId={initialPhotoId}
      actions={actions}
      currentYear={2026}
      onBack={onBack}
      onLeave={onLeave}
      onPhotoChange={onPhotoChange}
      {...props}
    />,
  );

// 헤더(숨김 시 투명도를 거는 래퍼)와 배지 묶음이 숨겨졌는지
const headerWrapper = () => screen.getByRole('banner').parentElement as HTMLElement;
const isHidden = (element: HTMLElement) => element.className.split(' ').includes('opacity-0');

beforeEach(() => {
  captured = {};
  swiper.activeIndex = 0;
  vi.clearAllMocks();
  savePhotos.mockImplementation((ids) => Promise.resolve({ savedIds: ids, failedIds: [] }));
  deletePhotos.mockResolvedValue({ removedCount: 1 });
  changePhotoDates.mockResolvedValue(undefined);
});

describe('PhotoDetailScreen 헤더와 사진', () => {
  it('뒤로가기·촬영 날짜·더보기가 있고 뒤로가기를 누르면 돌아간다', async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(within(screen.getByRole('banner')).getByText('9월 27일 일요일')).toBeTruthy();
    expect(screen.getByRole('button', { name: '더보기' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('지난해는 연도를, 촬영 날짜가 없으면 「날짜 미확인」을 보인다', () => {
    const { unmount } = renderScreen({}, 'p5');
    expect(screen.getByText('2025년 12월 24일')).toBeTruthy();
    unmount();

    renderScreen({}, 'p4');
    expect(screen.getByText('날짜 미확인')).toBeTruthy();
  });

  it('현재 사진과 올린 멤버 배지를 보이고 함께 올린 사진은 배지가 여러 개다', () => {
    // 슬라이드는 사진함 순서대로 놓이므로 현재 사진의 슬라이드만 골라 확인
    const badgeNames = (slideIndex: number) =>
      within(screen.getAllByTestId('slide')[slideIndex]!)
        .queryAllByText(/^(은우|경진)$/)
        .map((element) => element.textContent);

    const { unmount } = renderScreen({}, 'p1');
    expect(screen.getByRole('img', { name: '사진 p1' })).toBeTruthy();
    expect(badgeNames(0)).toEqual(['은우']);
    unmount();

    renderScreen({}, 'p2');
    expect(badgeNames(1)).toEqual(['은우', '경진']);
  });

  it('현재 사진 앞뒤 한 장씩만 그리고 나머지 슬라이드는 비워 둔다', () => {
    renderScreen({}, 'p3');

    expect(screen.getAllByTestId('slide')).toHaveLength(photos.length);
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual([
      '사진 p2',
      '사진 p3',
      '사진 p4',
    ]);
  });

  it('처리 중이거나 불러오지 못한 사진은 회색 자리표시로 보인다', () => {
    renderScreen({ photos: [photo('x', null, ['a'], 'processing')] }, 'x');

    expect(screen.getByRole('img', { name: '처리 중인 사진' })).toBeTruthy();
  });

  it('현재 사진의 위치를 항상 마운트된 상태 안내로 알린다', () => {
    renderScreen({}, 'p2');

    expect(screen.getByRole('status').textContent).toBe(PHOTO_BOX_MESSAGES.detailPosition(2, 5));
  });
});

describe('PhotoDetailScreen 숨기기와 넘기기', () => {
  it('한 번 누르면 헤더와 배지가 숨고 다시 누르면 보인다', () => {
    vi.useFakeTimers();
    renderScreen();

    act(() => {
      captured.onTap?.();
      vi.advanceTimersByTime(300);
    });
    expect(isHidden(headerWrapper())).toBe(true);

    act(() => {
      captured.onTap?.();
      vi.advanceTimersByTime(300);
    });
    expect(isHidden(headerWrapper())).toBe(false);
    vi.useRealTimers();
  });

  it('더블탭(확대)은 헤더 토글로 세지 않는다', () => {
    vi.useFakeTimers();
    renderScreen();

    act(() => {
      captured.onTap?.();
      captured.onDoubleTap?.();
      vi.advanceTimersByTime(300);
    });
    expect(isHidden(headerWrapper())).toBe(false);
    vi.useRealTimers();
  });

  it('확대하면 숨고 원래 크기로 돌아오면 다시 보인다', () => {
    renderScreen();

    act(() => captured.onZoomChange?.(swiper, 2));
    expect(isHidden(headerWrapper())).toBe(true);

    act(() => captured.onZoomChange?.(swiper, 1));
    expect(isHidden(headerWrapper())).toBe(false);
  });

  it('숨긴 헤더도 포커스가 들어오면 보이도록 focus-within 클래스를 둔다', () => {
    vi.useFakeTimers();
    renderScreen();
    act(() => {
      captured.onTap?.();
      vi.advanceTimersByTime(300);
    });

    expect(headerWrapper().className).toContain('focus-within:opacity-100');
    vi.useRealTimers();
  });

  it('사진을 넘기면 날짜와 주소 동기화 콜백이 바뀌고 숨긴 상태는 유지한다', () => {
    vi.useFakeTimers();
    renderScreen({}, 'p2');
    act(() => {
      captured.onTap?.();
      vi.advanceTimersByTime(300);
    });

    act(() => captured.onSlideChange?.({ ...swiper, activeIndex: 2 }));

    expect(onPhotoChange).toHaveBeenCalledWith('p3');
    expect(screen.getByText('9월 26일 토요일')).toBeTruthy();
    expect(isHidden(headerWrapper())).toBe(true);
    vi.useRealTimers();
  });

  it('이전·다음 버튼(스와이프 대체)이 슬라이드를 넘기고 처음·끝에서는 막힌다', async () => {
    const user = userEvent.setup();
    const { unmount } = renderScreen({}, 'p1');
    expect(screen.getByRole('button', { name: '이전 사진' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
    await user.click(screen.getByRole('button', { name: '이전 사진' }));
    expect(swiper.slidePrev).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '다음 사진' }));
    expect(swiper.slideNext).toHaveBeenCalledTimes(1);
    unmount();

    renderScreen({}, 'p5');
    expect(screen.getByRole('button', { name: '다음 사진' }).getAttribute('aria-disabled')).toBe(
      'true',
    );
    await user.click(screen.getByRole('button', { name: '다음 사진' }));
    expect(swiper.slideNext).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '이전 사진' }));
    expect(swiper.slidePrev).toHaveBeenCalledTimes(1);
  });
});

describe('PhotoDetailScreen 키보드와 확대 버튼', () => {
  it('확대·축소 버튼이 Swiper 확대를 토글하고 상태를 알린다', async () => {
    const user = userEvent.setup();
    renderScreen();

    const button = screen.getByRole('button', { name: '사진 확대' });
    await user.click(button);
    expect(swiper.zoom.toggle).toHaveBeenCalledTimes(1);

    act(() => captured.onZoomChange?.(swiper, 2));
    expect(screen.getByRole('button', { name: '사진 축소' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('메뉴가 열린 동안에는 방향키로 사진을 넘기지 않고 닫으면 다시 켠다', async () => {
    const user = userEvent.setup();
    renderScreen();
    vi.mocked(swiper.keyboard.disable).mockClear();

    await user.click(screen.getByRole('button', { name: '더보기' }));
    expect(swiper.keyboard.disable).toHaveBeenCalled();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(swiper.keyboard.enable).toHaveBeenCalled());
  });

  it('현재 사진 앞뒤가 아닌 슬라이드는 접근성 트리에서 숨긴다', () => {
    renderScreen({}, 'p3');
    const slides = screen.getAllByTestId('slide');

    expect(slides.map((slide) => slide.getAttribute('aria-hidden'))).toEqual([
      'true',
      null,
      null,
      null,
      'true',
    ]);
  });
});

describe('PhotoDetailScreen 더보기 메뉴', () => {
  it('올린 멤버·관리자는 저장·날짜 바꾸기·삭제를 본다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));

    const items = within(screen.getByRole('menu', { name: '사진 메뉴' })).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['저장', '날짜 바꾸기', '삭제']);
    expect(document.activeElement).toBe(items[0]);
  });

  it('일반 멤버가 다른 멤버 사진을 보면 저장만 있다', async () => {
    const user = userEvent.setup();
    renderScreen({ viewer: member }, 'p3');
    await user.click(screen.getByRole('button', { name: '더보기' }));

    const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['저장']);
  });

  it('Esc로 닫으면 포커스가 더보기로 돌아온다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));

    await user.keyboard('{Escape}');

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '더보기' }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});

describe('PhotoDetailScreen 날짜 바꾸기 시트', () => {
  // 달력은 오늘 이후를 막으므로 오늘을 고정하고, 촬영 날짜는 그보다 이른 날로 둠
  // d3·d4는 다른 멤버가 올린 사진과 함께 올린 사진(관리자 확인 창 대상)
  const datePhotos = [
    photo('d1', '2026-09-05T14:30', ['a']),
    photo('d2', null, ['a']),
    photo('d3', '2026-09-05T14:30', ['b']),
    photo('d4', '2026-09-05T14:30', ['a', 'b']),
  ];

  const openDateSheet = async (user: ReturnType<typeof userEvent.setup>, id = 'd1') => {
    renderScreen({ photos: datePhotos }, id);
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '날짜 바꾸기' }));
    return screen.findByRole('dialog', { name: '날짜 바꾸기' });
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 17, 12));
  });
  afterEach(() => vi.useRealTimers());

  it('사진의 촬영 날짜와 관계없이 오늘이 속한 달을 선택 없이 열고 저장은 막혀 있다(기능명세서 3.4.1)', async () => {
    const user = userEvent.setup();
    await openDateSheet(user);

    // d1의 촬영 날짜는 9월 5일이지만 시트는 오늘(10월)이 속한 달을 아무 날짜도 고르지 않은 채 엶
    expect(screen.getByRole('grid', { name: '2026년 10월' })).toBeTruthy();
    expect(screen.queryByRole('grid', { name: '2026년 9월' })).toBeNull();
    expect(
      screen
        .getAllByRole('button', { name: /^2026년 10월 \d+일$/ })
        .some((day) => day.parentElement?.getAttribute('aria-selected') === 'true'),
    ).toBe(false);
    expect(screen.getByRole('button', { name: '저장' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('촬영 날짜를 모르는 사진도 오늘이 있는 달을 선택 없이 연다', async () => {
    const user = userEvent.setup();
    await openDateSheet(user, 'd2');

    expect(screen.getByRole('grid', { name: '2026년 10월' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '저장' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('내가 올린 사진은 확인 창 없이 바로 바꾼다', async () => {
    const user = userEvent.setup();
    await openDateSheet(user);

    await user.click(screen.getByRole('button', { name: '2026년 10월 5일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(changePhotoDates).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('관리자가 다른 멤버가 올린 사진의 날짜를 바꾸면 확인 창을 거친 뒤 바꾼다', async () => {
    const user = userEvent.setup();
    await openDateSheet(user, 'd3');
    await user.click(screen.getByRole('button', { name: '2026년 10월 5일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    const dialog = await screen.findByRole('alertdialog', { name: '다른 멤버가 올린 사진이에요.' });
    expect(
      within(dialog).getByText('날짜를 변경하면 사진함에서 변경된 날짜로 보여요.'),
    ).toBeTruthy();
    expect(changePhotoDates).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: '변경하기' }));

    await waitFor(() => expect(changePhotoDates).toHaveBeenCalledTimes(1));
    const [ids] = changePhotoDates.mock.calls[0] as [string[], Date];
    expect(ids).toEqual(['d3']);
  });

  it('함께 올린 사진이면 다른 제목의 확인 창을 거친다', async () => {
    const user = userEvent.setup();
    await openDateSheet(user, 'd4');
    await user.click(screen.getByRole('button', { name: '2026년 10월 5일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(
      await screen.findByRole('alertdialog', {
        name: '다른 멤버가 업로드한 사진이 포함되어 있어요.',
      }),
    ).toBeTruthy();
  });

  it('확인 창에서 취소하면 바꾸지 않고 시트를 그대로 둔다', async () => {
    const user = userEvent.setup();
    await openDateSheet(user, 'd3');
    await user.click(screen.getByRole('button', { name: '2026년 10월 5일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));
    const dialog = await screen.findByRole('alertdialog', { name: '다른 멤버가 올린 사진이에요.' });

    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(changePhotoDates).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('dialog', { name: '날짜 바꾸기' })).toBeTruthy();
  });

  it('보던 사진이 그사이 지워져 거절되면 삭제된 사진 안내와 함께 사진함으로 돌아간다', async () => {
    const user = userEvent.setup();
    changePhotoDates.mockRejectedValue(new MissingPhotosError(['d1']));
    await openDateSheet(user);

    await user.click(screen.getByRole('button', { name: '2026년 10월 6일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
    expect(toastAfterNavigation).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto);
    expect(toast).not.toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateChangeFailed);
  });

  it('다른 날짜를 고르고 저장하면 날짜를 바꾸고 시트를 닫으며 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    await openDateSheet(user);

    await user.click(screen.getByRole('button', { name: '2026년 10월 12일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(changePhotoDates).toHaveBeenCalledTimes(1));
    const [ids, date] = changePhotoDates.mock.calls[0] as [string[], Date];
    expect(ids).toEqual(['d1']);
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 12]);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '날짜 바꾸기' })).toBeNull());
    expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateChanged);
  });

  it('저장하지 못하면 오류 토스트를 띄우고 시트를 그대로 둔다', async () => {
    const user = userEvent.setup();
    changePhotoDates.mockRejectedValue(new Error('network'));
    await openDateSheet(user);

    await user.click(screen.getByRole('button', { name: '2026년 10월 12일' }));
    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.dateChangeFailed));
    expect(screen.getByRole('dialog', { name: '날짜 바꾸기' })).toBeTruthy();
  });

  it('시트가 열린 동안에는 방향키로 사진을 넘기지 않는다', async () => {
    const user = userEvent.setup();
    await openDateSheet(user);

    expect(swiper.keyboard.disable).toHaveBeenCalled();
  });
});

describe('PhotoDetailScreen 저장', () => {
  it('저장하는 동안 화면 전체 로딩과 안내를 보이고 끝나면 완료 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    let finish!: (_result: SaveResult) => void;
    savePhotos.mockReturnValue(new Promise<SaveResult>((resolve) => (finish = resolve)));
    renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '저장' }));

    expect(savePhotos).toHaveBeenCalledWith(['p1']);
    expect(document.querySelector('.bg-overlay-dim-subtle')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe(PHOTO_BOX_MESSAGES.saving);
    expect(screen.getByRole('button', { name: '더보기' }).getAttribute('aria-disabled')).toBe(
      'true',
    );

    finish({ savedIds: ['p1'], failedIds: [] });
    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveDone));
    expect(document.querySelector('.bg-overlay-dim-subtle')).toBeNull();
  });

  it('저장하는 동안 사진 영역은 inert라 키보드로 넘길 수 없다', async () => {
    const user = userEvent.setup();
    let finish!: (_result: SaveResult) => void;
    savePhotos.mockReturnValue(new Promise<SaveResult>((resolve) => (finish = resolve)));
    renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '저장' }));

    expect(screen.getByTestId('swiper').closest('[inert]')).not.toBeNull();
    expect(swiper.keyboard.disable).toHaveBeenCalled();

    finish({ savedIds: ['p1'], failedIds: [] });
    await waitFor(() => expect(screen.getByTestId('swiper').closest('[inert]')).toBeNull());
  });

  it('저장하지 못하면 오류 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    savePhotos.mockResolvedValue({ savedIds: [], failedIds: ['p1'] });
    renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '저장' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveFailedAll));
  });

  it('사진 저장 권한이 거부되어 있으면 오류 토스트 대신 안내 창을 띄우고, 떠 있는 동안 방향키로 넘기지 않는다', async () => {
    const user = userEvent.setup();
    savePhotos.mockResolvedValue({ savedIds: [], failedIds: ['p1'], blocked: 'denied' });
    renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '저장' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(PHOTO_BOX_MESSAGES.albumPermissionTitle)).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
    expect(swiper.keyboard.disable).toHaveBeenCalled();

    vi.mocked(swiper.keyboard.enable).mockClear();
    await user.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(swiper.keyboard.enable).toHaveBeenCalled());
  });

  it('앱이 아니면 저장할 수 없다는 토스트를, 저장 기능이 없는 이전 앱이면 업데이트 안내 토스트를 띄운다', async () => {
    const user = userEvent.setup();
    savePhotos.mockResolvedValue({ savedIds: [], failedIds: ['p1'], blocked: 'unavailable' });
    const { unmount } = renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '저장' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveUnavailable));
    unmount();

    toast.mockClear();
    savePhotos.mockResolvedValue({ savedIds: [], failedIds: ['p1'], blocked: 'outdated' });
    renderScreen();
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '저장' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.uploadNeedsUpdate));
  });
});

describe('PhotoDetailScreen 삭제', () => {
  const openDeleteDialog = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: '더보기' }));
    await user.click(screen.getByRole('menuitem', { name: '삭제' }));
    return screen.getByRole('alertdialog');
  };

  it('확인 창에서 「취소」하면 지우지 않고 상세에 머문다', async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openDeleteDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '취소' }));

    expect(deletePhotos).not.toHaveBeenCalled();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('삭제하는 동안 화면 전체 로딩과 안내를 보이고, 끝나면 사진함으로 돌아간다', async () => {
    const user = userEvent.setup();
    let finish!: (_result: { removedCount: number }) => void;
    deletePhotos.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderScreen();
    const dialog = await openDeleteDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    expect(document.querySelector('.bg-overlay-dim-subtle')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe(PHOTO_BOX_MESSAGES.deleting);

    finish({ removedCount: 1 });
    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
  });

  it('확인 창을 연 사진을 지우며 그 사이 사진이 넘어가도 다른 사진을 지우지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen({}, 'p1');
    const dialog = await openDeleteDialog(user);

    act(() => captured.onSlideChange?.({ ...swiper, activeIndex: 2 }));
    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    expect(deletePhotos).toHaveBeenCalledWith(['p1']);
  });

  it('보던 사진이 그사이 지워져 거절되면 삭제된 사진 안내와 함께 사진함으로 돌아간다', async () => {
    const user = userEvent.setup();
    deletePhotos.mockRejectedValue(new MissingPhotosError(['p1']));
    renderScreen();
    const dialog = await openDeleteDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
    expect(toastAfterNavigation).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deletedPhoto);
    expect(toast).not.toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deleteFailed);
  });

  it('사진이 사라지면 삭제 토스트를 띄우고 사진함으로 돌아간다', async () => {
    const user = userEvent.setup();
    renderScreen();
    const dialog = await openDeleteDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    expect(deletePhotos).toHaveBeenCalledWith(['p1']);
    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
    expect(toastAfterNavigation).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deleteDone(1));
  });

  it('내 이름만 빠지고 사진이 남으면 토스트 없이 상세에 머문다', async () => {
    const user = userEvent.setup();
    deletePhotos.mockResolvedValue({ removedCount: 0 });
    renderScreen({}, 'p2');
    const dialog = await openDeleteDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    await waitFor(() => expect(deletePhotos).toHaveBeenCalled());
    expect(onLeave).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('삭제 요청이 실패하면 오류 토스트를 띄우고 머문다', async () => {
    const user = userEvent.setup();
    deletePhotos.mockRejectedValue(new Error('network'));
    renderScreen();
    const dialog = await openDeleteDialog(user);

    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));

    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.deleteFailed));
    expect(onLeave).not.toHaveBeenCalled();
  });
});
