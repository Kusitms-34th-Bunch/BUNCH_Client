import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BundleCard } from './BundleCard';

afterEach(cleanup);

const members = Array.from({ length: 10 }, (_, index) => ({ name: `멤버${index + 1}` }));

describe('BundleCard', () => {
  it('카드 버튼 이름은 번들 이름과 참여자 수다', () => {
    render(
      <BundleCard title="머그샷" imageSrc="/photo.jpg" members={members} onCardClick={() => {}} />,
    );

    expect(screen.getByRole('button', { name: /^머그샷\s*,\s*참여자 10명$/ })).toBeTruthy();
  });

  it('얼굴은 3명까지 그리고 넘는 인원은 「외 N명」으로 보이며, 전체를 장식으로 숨긴다', () => {
    const { container } = render(
      <BundleCard title="머그샷" imageSrc="/photo.jpg" members={members} onCardClick={() => {}} />,
    );

    expect(screen.getByText('외 7명')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(
      container.querySelectorAll('[aria-hidden="true"] > [role="img"] > span > *'),
    ).toHaveLength(3);
  });

  it('3명 이하면 「외 N명」이 없다', () => {
    render(
      <BundleCard
        title="머그샷"
        imageSrc="/photo.jpg"
        members={members.slice(0, 3)}
        onCardClick={() => {}}
      />,
    );

    expect(screen.queryByText(/^외 /)).toBeNull();
  });

  it('카드와 삭제 버튼을 따로 누른다', () => {
    const onCardClick = vi.fn();
    const onDelete = vi.fn();
    render(
      <BundleCard
        title="머그샷"
        imageSrc="/photo.jpg"
        members={members}
        onCardClick={onCardClick}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '머그샷 삭제' }));
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onCardClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^머그샷\s*,/ }));
    expect(onCardClick).toHaveBeenCalledOnce();
  });

  it('onDelete가 없으면 삭제 버튼을 그리지 않고, 빈 라벨은 기본값으로 대체한다', () => {
    const { rerender } = render(
      <BundleCard title="머그샷" imageSrc="/photo.jpg" members={[]} onCardClick={() => {}} />,
    );
    expect(screen.queryByRole('button', { name: /삭제/ })).toBeNull();

    rerender(
      <BundleCard
        title="머그샷"
        imageSrc="/photo.jpg"
        members={[]}
        onDelete={() => {}}
        onCardClick={() => {}}
        deleteLabel=""
      />,
    );
    expect(screen.getByRole('button', { name: '머그샷 삭제' })).toBeTruthy();
  });
});
