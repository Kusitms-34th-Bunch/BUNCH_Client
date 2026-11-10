import type * as DesignSystem from '@app/design-system';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Draft, DraftPhoto, DraftViewer } from '../../lib/types';
import { BUNDLE_MESSAGES, MAX_PHOTOS } from '../../constants/messages';
import { draftFixture } from '../../fixtures/draft.fixture';
import { DraftPhotoCaption } from './DraftPhotoCaption';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 편집 중 애니메이션의 lottie 엔진은 이 test의 대상이 아니므로 비움
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

const creator: DraftViewer = { memberId: 'jiye', bunchRole: 'owner' };
const outsider: DraftViewer = { memberId: 'outsider', bunchRole: 'member' };

const actions = {
  setPhotoCaption: vi.fn(),
  removePhoto: vi.fn(),
  movePhoto: vi.fn(),
};
const onBack = vi.fn();
const onPhotoChange = vi.fn();
const onOpenViewer = vi.fn();
const onImportFromBunchBox = vi.fn();
const onImportFromGallery = vi.fn();

type Options = {
  draft?: Draft;
  viewer?: DraftViewer;
  initialPhotoId?: string;
};

const renderCaption = ({
  draft = draftFixture,
  viewer = creator,
  initialPhotoId = 'draft-photo-1',
}: Options = {}) =>
  render(
    <DraftPhotoCaption
      draft={draft}
      viewer={viewer}
      actions={actions}
      initialPhotoId={initialPhotoId}
      onBack={onBack}
      onPhotoChange={onPhotoChange}
      onOpenViewer={onOpenViewer}
      onImportFromBunchBox={onImportFromBunchBox}
      onImportFromGallery={onImportFromGallery}
    />,
  );

const photo = (id: string, caption = ''): DraftPhoto => ({
  id,
  src: `/${id}.jpg`,
  alt: `사진 ${id}`,
  caption,
  takenAt: null,
  uploaderId: 'jiye',
});
const withPhotos = (photos: readonly DraftPhoto[]): Draft => ({ ...draftFixture, photos });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftPhotoCaption 구성', () => {
  it('헤더 「사진」과 사진 카드(페이지 카운터, 빼기 버튼)와 「사진 추가」 카드를 보여 준다', () => {
    renderCaption();

    expect(screen.getByRole('banner')).toHaveTextContent('사진');
    expect(screen.getAllByRole('img', { name: /한강에서 달리는 사람들/ })).toHaveLength(3);
    expect(screen.getByRole('img', { name: '1 / 3' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /사진 빼기/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: '사진 추가' })).toBeInTheDocument();
  });

  it('주소가 가리키는 사진의 캡션을 입력란에 보여 주고 그 사진 id로 주소를 맞추게 알린다', () => {
    renderCaption();

    expect(screen.getByRole('textbox', { name: '사진 캡션' })).toHaveValue(
      draftFixture.photos[0]?.caption,
    );
    expect(onPhotoChange).toHaveBeenCalledWith('draft-photo-1');
  });

  it('캡션이 없는 사진은 「캡션 추가...」를 보여 준다', () => {
    renderCaption({ initialPhotoId: 'draft-photo-2' });

    const field = screen.getByRole('textbox', { name: '사진 캡션' });
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('placeholder', BUNDLE_MESSAGES.captionPlaceholder);
  });

  it('20장이면 「사진 추가」 카드가 없다', () => {
    const draft = withPhotos(Array.from({ length: MAX_PHOTOS }, (_, index) => photo(`p${index}`)));
    renderCaption({ draft, initialPhotoId: 'p0' });

    expect(screen.queryByRole('button', { name: '사진 추가' })).not.toBeInTheDocument();
  });

  it('「사진 추가」를 누르면 가져올 곳을 고르는 시트가 열리고 사진함을 고르면 닫고 이동을 요청한다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '사진 추가' }));
    await userEvent.click(await screen.findByRole('button', { name: '번치 사진함에서 가져오기' }));

    expect(onImportFromBunchBox).toHaveBeenCalledTimes(1);
    expect(onImportFromGallery).not.toHaveBeenCalled();
  });

  it('내 갤러리를 고르면 더 담을 수 있는 장수와 함께 호출 지점을 부른다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '사진 추가' }));
    await userEvent.click(await screen.findByRole('button', { name: '내 갤러리에서 가져오기' }));

    expect(onImportFromGallery).toHaveBeenCalledWith(MAX_PHOTOS - draftFixture.photos.length);
    expect(onImportFromBunchBox).not.toHaveBeenCalled();
  });

  it('시트 카드를 연타해도 고른 출처는 한 번만 처리한다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '사진 추가' }));
    const card = await screen.findByRole('button', { name: '번치 사진함에서 가져오기' });
    fireEvent.click(card);
    fireEvent.click(card);

    expect(onImportFromBunchBox).toHaveBeenCalledTimes(1);
  });

  it('사진을 누르면 크게 보기로 간다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '2번째 사진 크게 보기' }));

    expect(onOpenViewer).toHaveBeenCalledWith('draft-photo-2');
  });

  it('화면 제목 h1을 하나 둔다(이동 뒤 초점이 가는 곳)', () => {
    renderCaption();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      BUNDLE_MESSAGES.photoCaptionTitle,
    );
  });

  it('뒤로 가기를 누르면 돌아간다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('DraftPhotoCaption 사진 위 프로필', () => {
  it('편집 중인 멤버가 없으면 사진 위에 프로필을 보이지 않는다', () => {
    renderCaption();

    expect(screen.queryByRole('img', { name: /편집 중/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /올린 사진/ })).not.toBeInTheDocument();
  });

  it('다른 멤버가 편집 중인 사진의 왼쪽 위에는 그 멤버의 프로필을 보인다(올린 멤버 아님)', () => {
    const draft: Draft = {
      ...draftFixture,
      editing: { photoEditors: { 'draft-photo-2': ['gyeongjin'] } },
    };
    renderCaption({ draft });

    expect(screen.getAllByRole('img', { name: '경진님이 편집 중' })).toHaveLength(1);
  });
});

describe('DraftPhotoCaption 캡션', () => {
  it('입력하면 그 사진의 캡션을 바꾼다', async () => {
    renderCaption({ initialPhotoId: 'draft-photo-2' });

    await userEvent.type(screen.getByRole('textbox', { name: '사진 캡션' }), '가');

    expect(actions.setPhotoCaption).toHaveBeenCalledWith('draft-photo-2', '가');
  });

  it('200자를 넘겨 붙이면 앞 200자만 저장하고 토스트로 알린다', async () => {
    renderCaption({ initialPhotoId: 'draft-photo-2' });
    const field = screen.getByRole('textbox', { name: '사진 캡션' });

    field.focus();
    await userEvent.paste('가'.repeat(230));

    expect(actions.setPhotoCaption).toHaveBeenCalledWith('draft-photo-2', '가'.repeat(200));
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.captionTooLong, {
      position: 'top',
    });
  });

  it('200자 이하는 토스트 없이 저장한다', async () => {
    renderCaption({ initialPhotoId: 'draft-photo-2' });

    await userEvent.type(screen.getByRole('textbox', { name: '사진 캡션' }), '안녕');

    expect(toast).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아니면 입력할 수 없고 안내한다', async () => {
    renderCaption({ viewer: outsider });

    const field = screen.getByRole('textbox', { name: '사진 캡션' });
    await userEvent.click(field);

    expect(field).toHaveAttribute('readonly');
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editOnlyParticipants, {
      position: 'top',
    });
    expect(actions.setPhotoCaption).not.toHaveBeenCalled();
  });

  it('다른 멤버가 이 사진을 편집 중이면 입력란 대신 편집 중 표시를 보이고 누르면 안내한다', async () => {
    const draft: Draft = {
      ...draftFixture,
      editing: { photoEditors: { 'draft-photo-1': ['gyeongjin'] } },
    };
    renderCaption({ draft });

    expect(screen.queryByRole('textbox', { name: '사진 캡션' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '경진님이 편집 중' }));

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, {
      position: 'top',
    });
  });

  it('잠금은 사진 한 장 단위라 다른 사진의 캡션은 입력할 수 있다', () => {
    const draft: Draft = {
      ...draftFixture,
      editing: { photoEditors: { 'draft-photo-1': ['gyeongjin'] } },
    };
    renderCaption({ draft, initialPhotoId: 'draft-photo-2' });

    expect(screen.getByRole('textbox', { name: '사진 캡션' })).toBeInTheDocument();
  });
});

describe('DraftPhotoCaption 사진 빼기', () => {
  it('캡션이 없는 사진도 확인 창을 거쳐 「삭제하기」를 눌러야 뺀다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '2번째 사진 빼기' }));
    expect(screen.getByText(BUNDLE_MESSAGES.removeConfirmTitle)).toBeInTheDocument();
    expect(screen.getByText(BUNDLE_MESSAGES.removeConfirmDescription)).toBeInTheDocument();
    expect(actions.removePhoto).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    expect(actions.removePhoto).toHaveBeenCalledWith('draft-photo-2');
  });

  it('캡션이 있는 사진도 같은 확인 창을 거쳐 「삭제하기」를 눌러야 뺀다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '1번째 사진 빼기' }));
    expect(screen.getByText(BUNDLE_MESSAGES.removeConfirmTitle)).toBeInTheDocument();
    expect(actions.removePhoto).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '삭제하기' }));
    expect(actions.removePhoto).toHaveBeenCalledWith('draft-photo-1');
  });

  it('확인 창에서 「취소」하면 빼지 않는다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: '1번째 사진 빼기' }));
    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(actions.removePhoto).not.toHaveBeenCalled();
  });

  it('사진이 1장이면 「사진을 삭제할 수 없어요」 안내만 하고 빼지 않는다', async () => {
    renderCaption({ draft: withPhotos([photo('only', '유일한 사진')]), initialPhotoId: 'only' });

    await userEvent.click(screen.getByRole('button', { name: /사진 빼기/ }));

    expect(screen.getByText(BUNDLE_MESSAGES.removePhotoBlockedTitle)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(actions.removePhoto).not.toHaveBeenCalled();
  });

  it('다른 멤버가 편집 중인 사진은 빼지 못하고 안내한다', async () => {
    const draft: Draft = {
      ...draftFixture,
      editing: { photoEditors: { 'draft-photo-2': ['gyeongjin'] } },
    };
    renderCaption({ draft });

    await userEvent.click(screen.getByRole('button', { name: '2번째 사진 빼기' }));

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, {
      position: 'top',
    });
    expect(actions.removePhoto).not.toHaveBeenCalled();
  });

  it('참여 멤버가 아니면 빼기 버튼이 없다', () => {
    renderCaption({ viewer: outsider });

    expect(screen.queryByRole('button', { name: /사진 빼기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '사진 추가' })).not.toBeInTheDocument();
  });
});

describe('DraftPhotoCaption 순서 바꾸기의 키보드 대체', () => {
  it('「사진을 뒤로 옮기기」는 한 칸 뒤로 옮기고 옮긴 자리를 알린다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: BUNDLE_MESSAGES.movePhotoAfter }));

    expect(actions.movePhoto).toHaveBeenCalledWith('draft-photo-1', 1);
    expect(screen.getByText('3장 중 2번째로 옮겼어요.')).toBeInTheDocument();
  });

  it('맨 앞 사진의 「앞으로 옮기기」는 아무것도 하지 않는다', async () => {
    renderCaption();

    await userEvent.click(screen.getByRole('button', { name: BUNDLE_MESSAGES.movePhotoBefore }));

    expect(actions.movePhoto).not.toHaveBeenCalled();
  });

  it('사진이 1장이면 옮기기 버튼이 없다', () => {
    renderCaption({ draft: withPhotos([photo('only')]), initialPhotoId: 'only' });

    expect(
      screen.queryByRole('button', { name: BUNDLE_MESSAGES.movePhotoAfter }),
    ).not.toBeInTheDocument();
  });

  it('참여 멤버가 아니면 옮기기 버튼이 없다', () => {
    renderCaption({ viewer: outsider });

    expect(
      screen.queryByRole('button', { name: BUNDLE_MESSAGES.movePhotoAfter }),
    ).not.toBeInTheDocument();
  });
});
