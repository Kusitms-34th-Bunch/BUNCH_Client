import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocationCard } from './LocationCard';

const base = {
  placeName: '봄날카페',
  address: '제주 제주시 애월읍',
  source: '여행가조',
  bundleTitle: '제주 3박 4일',
};

describe('LocationCard', () => {
  it('장소 이름·주소·출처를 차례로 읽고, 구분선은 쉼표로 읽힌다', () => {
    render(<LocationCard {...base} onClick={vi.fn()} />);

    const card = screen.getByRole('button', {
      name: '봄날카페 제주 제주시 애월읍 여행가조 , 제주 3박 4일',
    });
    expect(card).toBeTruthy();
    expect(screen.getByText('|').getAttribute('aria-hidden')).toBe('true');
  });

  it('카드를 누르면 onClick, 더보기를 누르면 onMore만 부른다', async () => {
    const onClick = vi.fn();
    const onMore = vi.fn();
    render(<LocationCard {...base} onClick={onClick} onMore={onMore} />);

    await userEvent.click(screen.getByRole('button', { name: '봄날카페 더보기' }));
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText('봄날카페'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('번들 제목이 없으면 구분선 없이 출처 한 문구만 보이고 길면 그 문구를 줄인다', () => {
    render(<LocationCard {...base} source="BUNCH PICK" bundleTitle={undefined} />);

    expect(screen.queryByText('|')).toBeNull();
    expect(screen.getByText('BUNCH PICK').className).toContain('truncate');
  });

  it('번들 제목이 있으면 번치 이름은 그대로 두고 번들 제목만 줄인다', () => {
    render(<LocationCard {...base} />);

    expect(screen.getByText('여행가조').className).toContain('shrink-0');
    expect(screen.getByText('제주 3박 4일').className).toContain('truncate');
  });

  it('onClick·onMore가 없으면 버튼 없이 보여 주기만 한다', () => {
    render(<LocationCard {...base} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('더보기 이름을 바꿀 수 있고, 긴 글자는 말줄임 클래스를 갖는다', () => {
    render(<LocationCard {...base} onMore={vi.fn()} moreLabel="봄날카페 콕 메뉴" />);

    expect(screen.getByRole('button', { name: '봄날카페 콕 메뉴' })).toBeTruthy();
    expect(screen.getByText('봄날카페').className).toContain('truncate');
    expect(screen.getByText('제주 제주시 애월읍').className).toContain('truncate');
  });

  it('키보드는 카드 버튼에서 더보기 버튼 순서로 이동한다', async () => {
    render(<LocationCard {...base} onClick={vi.fn()} onMore={vi.fn()} />);

    await userEvent.tab();
    expect(document.activeElement?.textContent).toContain('봄날카페');
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '봄날카페 더보기' }));
  });
});
