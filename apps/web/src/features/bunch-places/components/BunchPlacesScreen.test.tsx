import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KokPlace, PlaceMember } from '../lib/types';
import { placeMembersFixture, placesFixture } from '../fixtures/places.fixture';
import { sortByRecent } from '../lib/places';
import { BunchPlacesScreen } from './BunchPlacesScreen';

const onBack = vi.fn();
const onCopyAddress = vi.fn<(_place: KokPlace) => Promise<boolean>>();
const onCopyDone = vi.fn();
const onRemove = vi.fn();
const onBrowseFeed = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  onCopyAddress.mockResolvedValue(true);
});

const renderScreen = (
  places: readonly KokPlace[] = sortByRecent(placesFixture),
  members: readonly PlaceMember[] = placeMembersFixture,
) =>
  render(
    <BunchPlacesScreen
      members={members}
      places={places}
      onBack={onBack}
      onCopyAddress={onCopyAddress}
      onCopyDone={onCopyDone}
      onRemove={onRemove}
      onBrowseFeed={onBrowseFeed}
    />,
  );

const chip = (name: string) => screen.getByRole('radio', { name });

describe('BunchPlacesScreen', () => {
  it('「전체」가 선택된 상태로 전체와 멤버별 장소 수 칩을 보여 준다', () => {
    renderScreen();

    expect(chip('전체 12')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      '전체 12',
      '은우 5',
      '경진 4',
      '수인 2',
      '지예 1',
    ]);
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  it('멤버 칩을 고르면 그 멤버가 콕한 장소만 보이고 하나만 선택된다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(chip('수인 2'));

    expect(chip('수인 2')).toHaveAttribute('aria-checked', 'true');
    expect(chip('전체 12')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('전주 한옥마을'),
      expect.stringContaining('양양 서피비치'),
    ]);
  });

  it('방향키로 칩을 옮기면 바로 선택된다', async () => {
    const user = userEvent.setup();
    renderScreen();

    chip('전체 12').focus();
    await user.keyboard('{ArrowRight}');

    expect(chip('은우 5')).toHaveAttribute('aria-checked', 'true');
    expect(chip('은우 5')).toHaveFocus();
  });

  it('장소가 없는 멤버 칩에는 숫자를 붙이지 않고 고르면 빈 상태를 보인다', async () => {
    const user = userEvent.setup();
    renderScreen(sortByRecent(placesFixture), [
      ...placeMembersFixture,
      { id: 'new', name: '민지' },
    ]);

    await user.click(chip('민지'));

    expect(screen.getByRole('heading', { name: '아직 콕한 장소가 없어요' })).toBeInTheDocument();
    expect(chip('민지')).toHaveAttribute('aria-checked', 'true');
  });

  it('출처를 번들·BUNCH PICK·볼 수 없는 번들로 나누어 보여 준다', () => {
    renderScreen();

    const cards = screen.getAllByRole('listitem');
    const textOf = (name: string) =>
      cards.find((card) => card.textContent?.includes(name))?.textContent;
    expect(textOf('봄날카페')).toContain('여행가조');
    expect(textOf('봄날카페')).toContain('제주 3박 4일');
    expect(textOf('광안리 해변')).toContain('BUNCH PICK');
    expect(textOf('안목해변 커피거리')).toContain('볼 수 없는 번들이에요');
  });

  it('장소가 하나도 없으면 빈 상태를 보이고 「피드 둘러보기」로 이동을 요청한다', async () => {
    const user = userEvent.setup();
    renderScreen([]);

    expect(chip('전체 0')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/가보고 싶은 장소를 콕 해보세요/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '피드 둘러보기' }));

    expect(onBrowseFeed).toHaveBeenCalledOnce();
  });

  it('뒤로 가기를 누르면 이동을 요청한다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  describe('더보기 시트', () => {
    it('「주소 복사하기」를 고르면 누른 순간 복사하고 결과 알림은 시트가 닫힌 뒤 요청한다', async () => {
      const user = userEvent.setup();
      renderScreen();

      await user.click(screen.getByRole('button', { name: '봄날카페 더보기' }));
      expect(onCopyAddress).not.toHaveBeenCalled();
      await user.click(await screen.findByRole('button', { name: '주소 복사하기' }));

      // 클립보드 쓰기는 사용자 제스처 안이어야 해서 시트가 닫히기 전에 이미 불림
      expect(onCopyAddress).toHaveBeenCalledOnce();
      expect(onCopyAddress.mock.calls[0]?.[0]).toMatchObject({ id: 'bomnal-cafe' });
      await waitFor(() => expect(onCopyDone).toHaveBeenCalledWith(true));
    });

    it('복사에 실패하면 실패 결과를 알린다', async () => {
      onCopyAddress.mockResolvedValue(false);
      const user = userEvent.setup();
      renderScreen();

      await user.click(screen.getByRole('button', { name: '봄날카페 더보기' }));
      await user.click(await screen.findByRole('button', { name: '주소 복사하기' }));

      await waitFor(() => expect(onCopyDone).toHaveBeenCalledWith(false));
    });

    it('「콕에서 빼기」를 고르면 시트가 닫힌 뒤 그 장소를 빼 달라고 요청한다', async () => {
      const user = userEvent.setup();
      renderScreen();

      await user.click(screen.getByRole('button', { name: '해리단길 더보기' }));
      await user.click(await screen.findByRole('button', { name: '콕에서 빼기' }));

      await waitFor(() => expect(onRemove).toHaveBeenCalledOnce());
      expect(onRemove.mock.calls[0]?.[0]).toMatchObject({ id: 'haeridan-gil' });
    });

    it('「취소」를 누르면 아무 것도 요청하지 않고 닫는다', async () => {
      const user = userEvent.setup();
      renderScreen();

      await user.click(screen.getByRole('button', { name: '봄날카페 더보기' }));
      await user.click(await screen.findByRole('button', { name: '취소' }));

      await waitFor(() =>
        expect(screen.queryByRole('button', { name: '주소 복사하기' })).toBeNull(),
      );
      expect(onCopyAddress).not.toHaveBeenCalled();
      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('볼 수 없는 번들 모달', () => {
    const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
      const card = screen
        .getAllByRole('listitem')
        .find((item) => item.textContent?.includes('안목해변 커피거리'))!;
      // 카드 전체가 버튼이라 더보기가 아닌 카드 버튼을 누름
      const cardButton = within(card)
        .getAllByRole('button')
        .find((button) => !button.getAttribute('aria-label')?.includes('더보기'))!;
      await user.click(cardButton);
      return screen.findByRole('alertdialog');
    };

    it('카드를 누르면 이동하지 않고 안내 모달을 띄운다', async () => {
      const user = userEvent.setup();
      renderScreen();

      const dialog = await openModal(user);

      expect(
        within(dialog).getByText('이 장소가 담긴 번들을 더 이상 볼 수 없어요'),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText('번들이 삭제되었거나 비공개로 바뀌었어요.'),
      ).toBeInTheDocument();
    });

    it('「취소」는 장소를 남기고 모달만 닫는다', async () => {
      const user = userEvent.setup();
      renderScreen();

      const dialog = await openModal(user);
      await user.click(within(dialog).getByRole('button', { name: '취소' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(onRemove).not.toHaveBeenCalled();
    });

    it('「콕에서 빼기」는 모달이 닫힌 뒤 그 장소를 빼 달라고 요청한다', async () => {
      const user = userEvent.setup();
      renderScreen();

      const dialog = await openModal(user);
      await user.click(within(dialog).getByRole('button', { name: '콕에서 빼기' }));

      await waitFor(() => expect(onRemove).toHaveBeenCalledOnce());
      expect(onRemove.mock.calls[0]?.[0]).toMatchObject({ id: 'anmok-coffee' });
    });
  });
});
