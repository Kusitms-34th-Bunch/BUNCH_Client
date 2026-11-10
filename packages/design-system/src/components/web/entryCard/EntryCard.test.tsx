import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GraphicEntryCreateIcon } from '../../../icons';
import { EntryCard } from './EntryCard';

const renderCard = (props: Partial<Parameters<typeof EntryCard>[0]> = {}) =>
  render(
    <EntryCard
      title="새 번치 만들기"
      description="친구들을 초대하고 함께한 순간을 기록해봐요"
      imageSrc="/entry.jpg"
      graphic={<GraphicEntryCreateIcon data-testid="graphic" />}
      {...props}
    />,
  );

describe('EntryCard', () => {
  it('제목과 설명이 버튼의 이름이 된다', () => {
    renderCard();

    expect(
      screen.getByRole('button', {
        name: '새 번치 만들기 친구들을 초대하고 함께한 순간을 기록해봐요',
      }),
    ).toBeTruthy();
  });

  it('누르면 onClick을 호출한다', async () => {
    const onClick = vi.fn();
    renderCard({ onClick });

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Enter와 Space로도 누를 수 있다', async () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    screen.getByRole('button').focus();

    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('form 안에서 눌러도 제출하지 않는다', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <EntryCard title="제목" description="설명" imageSrc="/entry.jpg" graphic={null} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('배경 사진은 장식이라 접근성 트리에서 숨긴다', () => {
    const { container } = renderCard();

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/entry.jpg');
    expect(image?.getAttribute('alt')).toBe('');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('그래픽 아이콘을 숨긴 래퍼 안에 그린다', () => {
    renderCard();

    expect(screen.getByTestId('graphic').closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('className을 카드에 덧붙이고 ref를 전달한다', () => {
    const ref = { current: null as HTMLButtonElement | null };
    renderCard({ className: 'custom', ref });

    expect(screen.getByRole('button').classList.contains('custom')).toBe(true);
    expect(ref.current).toBe(screen.getByRole('button'));
  });
});
