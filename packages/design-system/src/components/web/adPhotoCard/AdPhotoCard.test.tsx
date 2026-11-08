import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdPhotoCard } from './AdPhotoCard';

const base = {
  title: '플로디스튜디오',
  imageSrc: 'ad.jpg',
  tagline: '여기서 뭉쳐봐요!',
  description: '도자기 원데이 클래스',
  location: '서울숲역 도보 7분',
  tags: ['최대 4인', '예약 가능'],
};

describe('AdPhotoCard', () => {
  it('배지·홍보 문구·장소 정보와 태그를 보여 주고, 콕하기·더보기를 각각 알린다', async () => {
    const onPick = vi.fn();
    const onMore = vi.fn();
    render(<AdPhotoCard {...base} picked={false} onPick={onPick} onMore={onMore} />);
    const card = screen.getByRole('article', { name: '광고 플로디스튜디오' });

    expect(within(card).getByText('BUNCH SPOT')).toBeTruthy();
    expect(within(card).getByRole('heading', { name: '플로디스튜디오' })).toBeTruthy();
    expect(within(card).getByText('위치', { exact: false })).toBeTruthy();
    expect(
      within(card)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['최대 4인', '예약 가능']);

    const pick = within(card).getByRole('button', { name: '콕하기' });
    expect(document.getElementById(pick.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      '플로디스튜디오',
    );
    await userEvent.click(pick);
    await userEvent.click(within(card).getByRole('button', { name: '플로디스튜디오 광고 더보기' }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it('담긴 장소는 「콕 했어요」', () => {
    render(<AdPhotoCard {...base} picked onPick={() => {}} onMore={() => {}} />);

    expect(screen.getByRole('button', { name: '콕 했어요' })).toBeTruthy();
  });

  it('숨김으로 바뀌면 같은 알림 영역에 안내를 채우고, 사진·버튼은 없으며 초점을 받을 수 있다', () => {
    const { rerender } = render(
      <AdPhotoCard {...base} picked={false} onPick={() => {}} onMore={() => {}} />,
    );
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');

    rerender(<AdPhotoCard state="hidden" title="플로디스튜디오" />);
    const card = screen.getByRole('article', { name: '광고 플로디스튜디오' });

    expect(screen.getByRole('status')).toBe(status);
    expect(card.tabIndex).toBe(-1);

    expect(within(card).getByRole('status').textContent).toBe('장소를 숨김 처리 했어요');
    expect(within(card).queryByRole('button')).toBeNull();
    expect(within(card).queryByRole('img')).toBeNull();
  });
});
