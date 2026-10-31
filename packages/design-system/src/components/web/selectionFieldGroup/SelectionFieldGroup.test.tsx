import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionFieldGroup, type SelectionFieldGroupProps } from './SelectionFieldGroup';

const renderGroup = (props?: Partial<SelectionFieldGroupProps>) =>
  render(
    <SelectionFieldGroup
      fieldLabel="위치"
      items={[{ id: 'a', value: '서울특별시 여의도동' }]}
      {...props}
    />,
  );

const rows = (container: HTMLElement) =>
  Array.from((container.firstElementChild as HTMLElement).children) as HTMLElement[];

describe('SelectionFieldGroup', () => {
  it('모든 행은 고른 값과 지우기 버튼을 보여 주고 빈 행은 없다', () => {
    renderGroup({
      items: [
        { id: 'a', value: '서울특별시 여의도동' },
        { id: 'b', value: '부산광역시 해운대구' },
      ],
    });

    expect(screen.getByRole('button', { name: '위치: 서울특별시 여의도동' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '서울특별시 여의도동 지우기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '위치: 부산광역시 해운대구' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '부산광역시 해운대구 지우기' })).toBeTruthy();
    expect(screen.queryByText('위치 추가')).toBeNull();
  });

  it('행을 누르면 그 행의 id로 onItemClick을 부른다', () => {
    const onItemClick = vi.fn();
    renderGroup({
      items: [
        { id: 'a', value: '서울' },
        { id: 'b', value: '부산' },
      ],
      onItemClick,
    });

    fireEvent.click(screen.getByRole('button', { name: '위치: 부산' }));

    expect(onItemClick).toHaveBeenCalledWith('b');
    expect(onItemClick).toHaveBeenCalledTimes(1);
  });

  it('지우기를 누르면 그 행의 id로 onItemClear만 부르고 행 클릭은 부르지 않는다', () => {
    const onItemClick = vi.fn();
    const onItemClear = vi.fn();
    renderGroup({ items: [{ id: 'a', value: '서울' }], onItemClick, onItemClear });

    fireEvent.click(screen.getByRole('button', { name: '서울 지우기' }));

    expect(onItemClear).toHaveBeenCalledWith('a');
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('clearLabel로 지우기 버튼 이름을 만든다', () => {
    renderGroup({ items: [{ id: 'a', value: '서울' }], clearLabel: (value) => `${value} 삭제` });

    expect(screen.getByRole('button', { name: '서울 삭제' })).toBeTruthy();
  });

  it('onAdd가 없으면 추가 행이 없고, 있으면 맨 아래에 나타나 누르면 호출된다', () => {
    const onAdd = vi.fn();
    const { rerender } = renderGroup();

    expect(screen.queryByRole('button', { name: '추가' })).toBeNull();

    rerender(<SelectionFieldGroup items={[{ id: 'a', value: '서울' }]} onAdd={onAdd} />);
    const add = screen.getByRole('button', { name: '추가' });

    expect(add.getAttribute('type')).toBe('button');
    expect(add.classList.contains('text-text-quaternary')).toBe(true);
    expect(add.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(add);

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('addLabel로 추가 행의 글자를 바꾼다', () => {
    renderGroup({ onAdd: () => {}, addLabel: 'Add' });

    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
  });

  it('행이 하나면 모서리를 그대로 두고 구분선을 그리지 않는다', () => {
    const { container } = renderGroup();
    const [only] = rows(container);

    expect(only?.classList.contains('rounded-r5')).toBe(true);
    expect(only?.classList.contains('rounded-b-none')).toBe(false);
    expect(only?.classList.contains('rounded-t-none')).toBe(false);
    expect(only?.classList.contains('before:hidden')).toBe(true);
  });

  it('맨 위·맨 아래 행만 모서리가 둥글고 가운데 행은 각지며 두 번째 행부터 구분선이 있다', () => {
    const { container } = renderGroup({
      items: [
        { id: 'a', value: '서울' },
        { id: 'b', value: '대구' },
        { id: 'c', value: '부산' },
      ],
    });
    const [first, middle, last] = rows(container);

    expect(first?.classList.contains('rounded-b-none')).toBe(true);
    expect(first?.classList.contains('rounded-t-none')).toBe(false);
    expect(middle?.classList.contains('rounded-none')).toBe(true);
    expect(last?.classList.contains('rounded-t-none')).toBe(true);
    expect(last?.classList.contains('rounded-b-none')).toBe(false);
    expect(first?.classList.contains('before:hidden')).toBe(true);
    for (const row of [middle, last]) {
      expect(row?.classList.contains('before:hidden')).toBe(false);
      expect(row?.classList.contains('before:h-px')).toBe(true);
      expect(row?.classList.contains('before:bg-surface-primary')).toBe(true);
      expect(row?.classList.contains('before:inset-x-4')).toBe(true);
    }
  });

  it('추가 행은 마지막 행으로 취급해 위 모서리를 각지게 하고 구분선을 둔다', () => {
    const { container } = renderGroup({ onAdd: () => {} });
    const [first, add] = rows(container);

    expect(first?.classList.contains('rounded-b-none')).toBe(true);
    expect(add?.classList.contains('rounded-t-none')).toBe(true);
    expect(add?.classList.contains('before:h-px')).toBe(true);
    expect(add?.classList.contains('before:hidden')).toBe(false);
  });

  it('행이 포커스되면 위로 올라와 윤곽선이 다음 행에 가려지지 않는다', () => {
    const { container } = renderGroup({ onAdd: () => {} });

    for (const row of rows(container)) {
      expect(row.classList.contains('has-focus-visible:z-10')).toBe(true);
    }
  });

  it('clearLabel은 값과 행 순서를 받는다', () => {
    renderGroup({
      items: [
        { id: 'a', value: '서울' },
        { id: 'b', value: '서울' },
      ],
      clearLabel: (value, index) => `${index + 1}번째 ${value} 지우기`,
    });

    expect(screen.getByRole('button', { name: '1번째 서울 지우기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '2번째 서울 지우기' })).toBeTruthy();
  });

  it('추가 행도 44px(h-11) 높이에 secondary 배경이다', () => {
    renderGroup({ onAdd: () => {} });
    const add = screen.getByRole('button', { name: '추가' });

    expect(add.classList.contains('h-11')).toBe(true);
    expect(add.classList.contains('bg-surface-secondary')).toBe(true);
    expect(add.classList.contains('focus-visible:outline-2')).toBe(true);
    // 추가 버튼은 자기 자신이 포커스를 받으므로 has-[...]가 아니라 focus-visible로 위로 올려야 함
    expect(add.classList.contains('focus-visible:z-10')).toBe(true);
  });

  it('groupLabel을 주면 하나의 group으로 묶이고 없으면 역할이 없다', () => {
    const { rerender } = renderGroup();

    expect(screen.queryByRole('group')).toBeNull();

    rerender(
      <SelectionFieldGroup items={[{ id: 'a', value: '서울' }]} groupLabel="번치 위치 목록" />,
    );

    expect(screen.getByRole('group', { name: '번치 위치 목록' })).toBeTruthy();
  });

  it('행이 하나도 없으면 아무것도 그리지 않는다', () => {
    const { container } = renderGroup({ items: [] });

    expect(container.firstElementChild).toBeNull();
  });

  it('className과 div 속성이 카드에 합쳐진다', () => {
    const { container } = renderGroup({ className: 'mt-2', 'data-testid': 'group' } as never);

    expect((container.firstElementChild as HTMLElement).className).toContain('mt-2');
    expect(screen.getByTestId('group')).toBeTruthy();
  });
});
