import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Picks } from '../../lib/picks';
import { draftFixture } from '../../fixtures/draft.fixture';
import { DraftPickScreen } from './DraftPickScreen';

const onToggle = vi.fn();
const onDenied = vi.fn();
const onBack = vi.fn();

type Options = {
  picks?: Picks;
  editable?: boolean;
  photos?: typeof draftFixture.photos;
  viewerId?: string;
};

const screenElement = ({
  picks = {},
  editable = true,
  photos = draftFixture.photos,
  viewerId = 'jiye',
}: Options = {}) => (
  <DraftPickScreen
    photos={photos}
    members={draftFixture.members}
    viewerId={viewerId}
    picks={picks}
    editable={editable}
    onToggle={onToggle}
    onDenied={onDenied}
    onBack={onBack}
  />
);

const renderScreen = (options: Options = {}) => render(screenElement(options));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DraftPickScreen', () => {
  it('안내 문구와 제목, 번들 사진 전체와 「이 사진 픽하기」를 보인다', () => {
    renderScreen();

    expect(
      screen.getByRole('heading', { name: '마음에 드는 사진을 픽해보세요' }),
    ).toBeInTheDocument();
    expect(screen.getByText('번들이 업로드되면 누가 픽했는지 보여요.')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(draftFixture.photos.length);
    expect(screen.getByRole('button', { name: '이 사진 픽하기' })).toBeInTheDocument();
  });

  it('사진 목록 좌우 여백은 폭에서 계산해 첫 장과 마지막 장이 어떤 폭에서도 가운데에 선다', () => {
    renderScreen();

    const list = screen.getByRole('list', { name: '번들 사진' });
    // 사진 폭 295의 절반(147.5px)을 뺀 좌우 여백
    expect(list.className).toContain('px-[calc(50%-147.5px)]');
  });

  it('아무도 픽하지 않은 사진에는 픽한 멤버 영역이 없다', () => {
    renderScreen();

    expect(screen.queryByText(/명이 픽했어요/)).not.toBeInTheDocument();
  });

  it('「이 사진 픽하기」를 누르면 지금 사진의 id로 onToggle을 부른다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '이 사진 픽하기' }));

    expect(onToggle).toHaveBeenCalledWith(draftFixture.photos[0]!.id);
  });

  it('내가 픽한 사진은 「사진을 픽했어요」로 바뀌고 픽한 멤버를 내가 맨 앞에 보인다', () => {
    const photoId = draftFixture.photos[0]!.id;
    renderScreen({ picks: { [photoId]: ['gyeongjin', 'jiye'] } });

    expect(screen.getByRole('button', { name: '사진을 픽했어요' })).toBeInTheDocument();
    expect(screen.getByText('2명이 픽했어요')).toBeInTheDocument();
    const names = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent)
      .filter((text) => text?.startsWith('지예') || text?.startsWith('경진'));
    // 내 칩에는 보이지 않는 「(나)」가 붙어 읽힘
    expect(names).toEqual(['지예 (나)', '경진']);
  });

  it('픽한 멤버는 한 줄에 4명씩 나눠 보인다', () => {
    const photoId = draftFixture.photos[0]!.id;
    const ids = draftFixture.members.map((member) => member.id);
    renderScreen({ picks: { [photoId]: ids } });

    expect(screen.getByText(`${ids.length}명이 픽했어요`)).toBeInTheDocument();
    const rows = screen.getAllByRole('list').filter((list) => list.tagName === 'UL');
    // 첫 목록은 사진 목록이고, 나머지가 멤버 줄
    expect(rows.length - 1).toBe(Math.ceil(ids.length / 4));
  });

  it('참여 멤버가 아니면 픽하지 못하고 안내한다', async () => {
    renderScreen({ editable: false });

    await userEvent.click(screen.getByRole('button', { name: '이 사진 픽하기' }));

    expect(onToggle).not.toHaveBeenCalled();
    expect(onDenied).toHaveBeenCalledTimes(1);
  });

  it('뒤로 가기를 누르면 onBack을 부른다', async () => {
    renderScreen();

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('보던 사진이 지워지면 「삭제된 사진이에요」 안내 창이 뜬다', async () => {
    const { rerender } = renderScreen();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    rerender(screenElement({ photos: draftFixture.photos.slice(1) }));

    const dialog = await screen.findByRole('alertdialog', { name: '삭제된 사진이에요' });
    expect(dialog).toHaveAccessibleDescription('삭제된 사진은 픽할 수 없어요.');
    await userEvent.click(within(dialog).getByRole('button', { name: '확인' }));
  });

  describe('픽하기 모션', () => {
    const sparks = (root: HTMLElement) => root.querySelectorAll('span[class*="spark"]');

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('픽하면 하얀 반짝임과 사라지는 이전 수가 3.4초 동안 보이고 그 뒤 사라진다', () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { container, rerender } = renderScreen({ picks: { jiye: ['x'] } });
      expect(sparks(container)).toHaveLength(0);

      // 픽하기 전 한 명(다른 멤버)이 픽한 사진
      const photoId = draftFixture.photos[0]!.id;
      const before: Picks = { [photoId]: [draftFixture.members[1]!.id] };
      rerender(screenElement({ picks: before }));
      act(() => screen.getByRole('button', { name: '이 사진 픽하기' }).click());
      rerender(screenElement({ picks: { [photoId]: [draftFixture.members[1]!.id, 'jiye'] } }));

      expect(sparks(container)).toHaveLength(8);
      expect(container.querySelectorAll('span[class*="miniModule"]')).toHaveLength(13);
      expect(screen.getByText('1명이 픽했어요')).toHaveAttribute('aria-hidden', 'true');

      act(() => {
        vi.advanceTimersByTime(3400);
      });
      expect(sparks(container)).toHaveLength(0);
      expect(screen.queryByText('1명이 픽했어요')).not.toBeInTheDocument();
    });

    it('픽을 해제할 때는 모션이 없다', () => {
      const { container, rerender } = renderScreen({ picks: {} });
      const photoId = draftFixture.photos[0]!.id;
      rerender(screenElement({ picks: { [photoId]: ['jiye'] } }));
      act(() => screen.getByRole('button', { name: '사진을 픽했어요' }).click());
      rerender(screenElement({ picks: {} }));

      expect(sparks(container)).toHaveLength(0);
    });

    it('동작 줄이기 설정이면 모션을 그리지 않는다', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      const { container, rerender } = renderScreen();
      act(() => screen.getByRole('button', { name: '이 사진 픽하기' }).click());
      rerender(screenElement({ picks: { [draftFixture.photos[0]!.id]: ['jiye'] } }));

      expect(sparks(container)).toHaveLength(0);
    });
  });
});
