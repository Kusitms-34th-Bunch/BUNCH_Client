import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_MEMBERS, type KokPlace, type PlaceMember } from '../lib/types';
import { BunchPlacesScreen } from './BunchPlacesScreen';

const onBack = vi.fn();
const onSelect = vi.fn();
const onCopyAddress = vi.fn<(_place: KokPlace) => Promise<boolean>>();
const onCopyDone = vi.fn();
const onRemove = vi.fn();
const onBrowseFeed = vi.fn();
const onRetry = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  onCopyAddress.mockResolvedValue(true);
});

const MEMBERS: readonly PlaceMember[] = [
  { id: '3', name: '은우' },
  { id: '2', name: '경진' },
  { id: '4', name: '수인' },
];
const COUNTS = { [ALL_MEMBERS]: 4, '3': 2, '2': 2, '4': 0 };

const place = (id: string, name: string, source: KokPlace['source']): KokPlace => ({
  id,
  name,
  address: `${name} 주소`,
  pickedBy: '3',
  source,
});

const PLACES: readonly KokPlace[] = [
  place('1', '봄날카페', { kind: 'bundle', bunchName: '캠핑러버', bundleTitle: '가평 첫 캠핑' }),
  place('2', '해리단길', { kind: 'bundle', bunchName: '캠핑러버', bundleTitle: '여름밤 캠핑' }),
  place('3', '광안리 해변', { kind: 'pick' }),
  place('4', '안목해변 커피거리', { kind: 'unavailable' }),
];

type Overrides = Partial<{
  places: readonly KokPlace[] | undefined;
  counts: Readonly<Record<string, number>>;
  selectedId: string;
  busy: boolean;
  onRetry: () => void;
}>;

const renderScreen = (overrides: Overrides = {}) =>
  render(
    <BunchPlacesScreen
      members={MEMBERS}
      counts={COUNTS}
      selectedId={ALL_MEMBERS}
      onSelect={onSelect}
      places={PLACES}
      onBack={onBack}
      onCopyAddress={onCopyAddress}
      onCopyDone={onCopyDone}
      onRemove={onRemove}
      onBrowseFeed={onBrowseFeed}
      {...overrides}
    />,
  );

const chip = (name: string) => screen.getByRole('radio', { name });

describe('BunchPlacesScreen', () => {
  it('받은 개수로 칩을 그리고 고른 칩만 선택한다. 장소가 없는 멤버 칩에는 숫자를 붙이지 않는다', () => {
    renderScreen({ selectedId: '2' });

    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      '전체 4',
      '은우 2',
      '경진 2',
      '수인',
    ]);
    expect(chip('경진 2')).toHaveAttribute('aria-checked', 'true');
    expect(chip('전체 4')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('칩을 누르거나 방향키로 옮기면 그 멤버를 고르라고 요청한다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(chip('수인'));
    expect(onSelect).toHaveBeenLastCalledWith('4');

    chip('전체 4').focus();
    await user.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('3');
    expect(chip('은우 2')).toHaveFocus();
  });

  it('출처를 번들·BUNCH SPOT·볼 수 없는 번들로 나누어 보여 준다', () => {
    renderScreen();

    const textOf = (name: string) =>
      screen.getAllByRole('listitem').find((card) => card.textContent?.includes(name))?.textContent;
    expect(textOf('봄날카페')).toContain('캠핑러버');
    expect(textOf('봄날카페')).toContain('가평 첫 캠핑');
    expect(textOf('광안리 해변')).toContain('BUNCH SPOT');
    expect(textOf('안목해변 커피거리')).toContain('볼 수 없는 번들이에요');
  });

  it('받는 중에는 칩·목록·빈 상태를 보이지 않는다', () => {
    renderScreen({ places: undefined });

    expect(screen.queryByRole('radio')).toBeNull();

    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('heading', { name: '아직 콕한 장소가 없어요' })).toBeNull();
  });

  it('칩을 바꿔 받는 중이면 보던 목록을 바쁨으로 알린다', () => {
    renderScreen({ busy: true });

    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
  });

  it('받지 못하면 오류를 알리고 「다시 시도」로 다시 받게 한다', async () => {
    const user = userEvent.setup();
    renderScreen({ places: undefined, onRetry });

    expect(screen.getByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('장소가 하나도 없으면 빈 상태를 보이고 「피드 둘러보기」로 이동을 요청한다', async () => {
    const user = userEvent.setup();
    renderScreen({ places: [], counts: { [ALL_MEMBERS]: 0 } });

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
      expect(onCopyAddress.mock.calls[0]?.[0]).toMatchObject({ id: '1' });
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
      expect(onRemove.mock.calls[0]?.[0]).toMatchObject({ id: '2' });
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
      expect(onRemove.mock.calls[0]?.[0]).toMatchObject({ id: '4' });
    });
  });
});
