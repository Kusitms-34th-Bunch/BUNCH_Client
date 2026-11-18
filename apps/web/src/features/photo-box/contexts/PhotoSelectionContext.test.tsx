import { render } from '@testing-library/react';
import { memo } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PhotoSelection } from '../lib/selection';
import { usePhotoOrder, usePhotoSelectionActions } from './photoSelection';
import { PhotoSelectionProvider } from './PhotoSelectionContext';

const onRender = vi.fn<(_id: string) => void>();
const renderCounts = () => {
  const counts: Record<string, number> = {};
  for (const [id] of onRender.mock.calls) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
};

// 실제 사진 칸처럼 memo로 감싸 부모가 다시 그려져도 props가 같으면 건너뜀
const Cell = memo(function Cell({ id }: { id: string }) {
  onRender(id);
  const order = usePhotoOrder(id);
  return <span data-testid={id}>{order ?? '-'}</span>;
});

function Cells() {
  return (
    <>
      <Cell id="a" />
      <Cell id="b" />
      <Cell id="c" />
    </>
  );
}

const tree = (selection: PhotoSelection, onToggle = vi.fn()) => (
  <PhotoSelectionProvider value={{ active: true, selection, onToggle }}>
    <Cells />
  </PhotoSelectionProvider>
);

describe('PhotoSelectionProvider', () => {
  it('사진 하나를 골라도 번호가 바뀐 사진 칸만 다시 그려진다', () => {
    onRender.mockClear();
    const { rerender, getByTestId } = render(tree([]));
    expect(renderCounts()).toEqual({ a: 1, b: 1, c: 1 });

    rerender(tree(['b']));

    expect(getByTestId('b').textContent).toBe('1');
    expect(renderCounts()).toEqual({ a: 1, b: 2, c: 1 });
  });

  it('앞 사진을 풀면 뒤 사진의 번호만 당겨져 다시 그려진다', () => {
    onRender.mockClear();
    const { rerender, getByTestId } = render(tree(['a', 'b', 'c']));
    expect(renderCounts()).toEqual({ a: 1, b: 1, c: 1 });

    rerender(tree(['b', 'c']));

    expect(getByTestId('a').textContent).toBe('-');
    expect(getByTestId('b').textContent).toBe('1');
    expect(getByTestId('c').textContent).toBe('2');
    expect(renderCounts()).toEqual({ a: 2, b: 2, c: 2 });
  });

  it('토글 함수는 선택이 바뀌어도 같은 참조이고 항상 최신 함수를 부른다', () => {
    const first = vi.fn();
    const second = vi.fn();
    const seen: ((_id: string) => void)[] = [];
    function Probe() {
      seen.push(usePhotoSelectionActions().onToggle);
      return null;
    }
    const { rerender } = render(
      <PhotoSelectionProvider value={{ active: true, selection: [], onToggle: first }}>
        <Probe />
      </PhotoSelectionProvider>,
    );
    rerender(
      <PhotoSelectionProvider value={{ active: true, selection: ['a'], onToggle: second }}>
        <Probe />
      </PhotoSelectionProvider>,
    );

    seen.at(-1)?.('a');

    expect(new Set(seen).size).toBe(1);
    expect(second).toHaveBeenCalledWith('a');
    expect(first).not.toHaveBeenCalled();
  });
});
