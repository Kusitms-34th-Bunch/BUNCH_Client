import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_BOX_MESSAGES } from '@/features/photo-box/constants/messages';
import type { Draft, DraftPhoto, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { draftFixture } from '../../fixtures/draft.fixture';
import { DraftPhotoViewer } from './DraftPhotoViewer';

// 재생·제스처 라이브러리는 모양과 제스처를 검증하지 않으므로 mock
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: ReactNode }) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: { children: ReactNode }) => <div data-testid="slide">{children}</div>,
}));
vi.mock('swiper/modules', () => ({ A11y: {}, Keyboard: {}, Zoom: {} }));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/zoom', () => ({}));
// 저장 중 로딩 점의 lottie 엔진은 이 test의 대상이 아니므로 비움
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const creator: DraftViewer = { memberId: 'jiye', bunchRole: 'owner' };
const outsider: DraftViewer = { memberId: 'outsider', bunchRole: 'member' };

const actions = { removePhoto: vi.fn() };
const onBack = vi.fn();
const onPhotoChange = vi.fn();

type Options = {
  draft?: Draft;
  viewer?: DraftViewer;
  initialPhotoId?: string;
};

const renderViewer = ({
  draft = draftFixture,
  viewer = creator,
  initialPhotoId = 'draft-photo-2',
}: Options = {}) =>
  render(
    <DraftPhotoViewer
      draft={draft}
      viewer={viewer}
      actions={actions}
      initialPhotoId={initialPhotoId}
      currentYear={2026}
      onBack={onBack}
      onPhotoChange={onPhotoChange}
    />,
  );

const photo = (id: string): DraftPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: `사진 ${id}`,
  takenAt: '2026-06-20T19:00',
  uploaderId: 'jiye',
});

const openMenu = async () => {
  await userEvent.click(screen.getByRole('button', { name: '더보기' }));
  return within(screen.getByRole('menu', { name: '사진 메뉴' }));
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftPhotoViewer 구성', () => {
  it('헤더에 촬영 날짜와 ⋯가 있고 번들 사진을 모두 슬라이드로 둔다', () => {
    renderViewer();

    expect(screen.getByRole('banner')).toHaveTextContent('6월 20일 토요일');
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(screen.getAllByTestId('slide')).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent('3장 중 2번째 사진');
  });

  it('올린 멤버 배지를 사진 위에 보여 준다', () => {
    renderViewer({ initialPhotoId: 'draft-photo-2' });

    expect(screen.getByText('경진')).toBeInTheDocument();
  });

  it('사진함 원본이 있으면 번들에 담은 사람이 아니라 사진 소유자와 촬영 날짜를 보여 준다', () => {
    // draft-photo-2의 원본(photo-2): 번들에 담은 사람은 경진이지만 올린 사람은 서현, 촬영 날짜는 6월 5일
    render(
      <DraftPhotoViewer
        draft={draftFixture}
        viewer={creator}
        actions={actions}
        initialPhotoId="draft-photo-2"
        sources={new Map([['photo-2', { takenAt: '2026-06-05T10:00', uploaderIds: ['seohyeon'] }]])}
        bunchMembers={[{ id: 'seohyeon', name: '서현' }]}
        currentYear={2026}
        onBack={onBack}
        onPhotoChange={onPhotoChange}
      />,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('6월 5일 금요일');
    expect(screen.getByText('서현')).toBeInTheDocument();
    expect(screen.queryByText('경진')).not.toBeInTheDocument();
  });

  it('사진함 데이터를 받는 동안에도 화면은 보이고 배지와 날짜만 비운다', () => {
    render(
      <DraftPhotoViewer
        draft={draftFixture}
        viewer={creator}
        actions={actions}
        initialPhotoId="draft-photo-2"
        sourcesPending
        currentYear={2026}
        onBack={onBack}
        onPhotoChange={onPhotoChange}
      />,
    );

    expect(screen.getAllByTestId('slide')).toHaveLength(3);
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).not.toHaveTextContent('날짜 미확인');
    expect(screen.queryByText('경진')).not.toBeInTheDocument();
  });

  it('사진함 목록에 원본이 없는 사진은 번들에 담은 사람을 소유자로 보이지 않는다', () => {
    render(
      <DraftPhotoViewer
        draft={draftFixture}
        viewer={creator}
        actions={actions}
        initialPhotoId="draft-photo-2"
        sources={new Map()}
        bunchMembers={[]}
        currentYear={2026}
        onBack={onBack}
        onPhotoChange={onPhotoChange}
      />,
    );

    expect(screen.queryByText('경진')).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('날짜 미확인');
  });

  it('뒤로 가기를 누르면 돌아간다', async () => {
    renderViewer();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('DraftPhotoViewer ⋯ 메뉴', () => {
  it('참여 멤버에게는 「저장」과 「삭제」를 보여 주고 날짜 바꾸기는 없다', async () => {
    renderViewer();

    const menu = await openMenu();

    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['저장', '삭제']);
  });

  it('「저장」과 「삭제」 사이에 구분선이 없다(Figma `1782:32912`)', async () => {
    renderViewer();

    await openMenu();

    expect(
      within(screen.getByRole('menu', { name: '사진 메뉴' })).queryByRole('separator'),
    ).toBeNull();
  });

  it('참여 멤버가 아니면 「저장」만 보여 준다', async () => {
    renderViewer({ viewer: outsider });

    const menu = await openMenu();

    expect(menu.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['저장']);
  });

  it('「저장」은 저장 중 로딩을 보이다가 끝나면 저장 완료 토스트를 띄운다', async () => {
    renderViewer();

    await userEvent.click((await openMenu()).getByRole('menuitem', { name: '저장' }));

    expect(screen.getByText(PHOTO_BOX_MESSAGES.saving)).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(PHOTO_BOX_MESSAGES.saveDone), {
      timeout: 3000,
    });
    expect(screen.queryByText(PHOTO_BOX_MESSAGES.saving)).not.toBeInTheDocument();
  });
});

describe('DraftPhotoViewer 삭제', () => {
  it('확인 창에서 「삭제하기」를 누르면 빼고 이웃 사진으로 이어서 본다', async () => {
    renderViewer({ initialPhotoId: 'draft-photo-2' });

    await userEvent.click((await openMenu()).getByRole('menuitem', { name: '삭제' }));
    expect(screen.getByText(BUNDLE_MESSAGES.removeConfirmTitle)).toBeInTheDocument();
    expect(actions.removePhoto).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(actions.removePhoto).toHaveBeenCalledWith('draft-photo-2');
    expect(onPhotoChange).toHaveBeenCalledWith('draft-photo-3');
  });

  it('마지막 사진을 빼면 앞 사진으로 이어서 본다', async () => {
    renderViewer({ initialPhotoId: 'draft-photo-3' });

    await userEvent.click((await openMenu()).getByRole('menuitem', { name: '삭제' }));
    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(actions.removePhoto).toHaveBeenCalledWith('draft-photo-3');
    expect(onPhotoChange).toHaveBeenCalledWith('draft-photo-2');
  });

  it('첫 번째 사진도 같은 확인 창에서 「삭제하기」를 눌러야 뺀다', async () => {
    renderViewer({ initialPhotoId: 'draft-photo-1' });

    await userEvent.click((await openMenu()).getByRole('menuitem', { name: '삭제' }));
    expect(screen.getByText(BUNDLE_MESSAGES.removeConfirmTitle)).toBeInTheDocument();
    expect(actions.removePhoto).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    expect(actions.removePhoto).toHaveBeenCalledWith('draft-photo-1');
  });

  it('사진이 1장이면 「사진을 삭제할 수 없어요」 안내만 한다', async () => {
    const draft: Draft = { ...draftFixture, photos: [photo('only')] };
    renderViewer({ draft, initialPhotoId: 'only' });

    await userEvent.click((await openMenu()).getByRole('menuitem', { name: '삭제' }));

    expect(screen.getByText(BUNDLE_MESSAGES.removePhotoBlockedTitle)).toBeInTheDocument();
    expect(actions.removePhoto).not.toHaveBeenCalled();
  });

  it('다른 멤버가 편집 중인 사진은 삭제하지 못하고 안내한다', async () => {
    const draft: Draft = {
      ...draftFixture,
      editing: { photoEditors: { 'draft-photo-2': ['gyeongjin'] } },
    };
    renderViewer({ draft, initialPhotoId: 'draft-photo-2' });

    await userEvent.click((await openMenu()).getByRole('menuitem', { name: '삭제' }));

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked);
    expect(actions.removePhoto).not.toHaveBeenCalled();
  });
});
