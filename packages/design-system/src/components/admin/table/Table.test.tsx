import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Table } from './Table';

afterEach(cleanup);

const Example = ({
  onOpen = vi.fn(),
  selected = false,
  disabled = false,
}: {
  onOpen?: () => void;
  selected?: boolean;
  disabled?: boolean;
}) => (
  <Table.Root aria-label="번치 스팟 목록" columns="300px 1fr 28px">
    <Table.Header>
      <Table.HeaderCell>장소</Table.HeaderCell>
      <Table.HeaderCell>위치</Table.HeaderCell>
      <Table.HeaderCell align="end">콕</Table.HeaderCell>
    </Table.Header>
    <Table.Body>
      <Table.Row selected={selected} disabled={disabled}>
        <Table.Cell>
          <Table.RowButton onClick={onOpen}>플로디스튜디오</Table.RowButton>
        </Table.Cell>
        <Table.Cell>서울숲역 도보 7분</Table.Cell>
        <Table.Cell align="end">128</Table.Cell>
      </Table.Row>
    </Table.Body>
  </Table.Root>
);

describe('Table', () => {
  it('이름 있는 표에 열 제목과 칸을 표 역할로 그린다', () => {
    render(<Example />);

    const table = screen.getByRole('table', { name: '번치 스팟 목록' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['장소', '위치', '콕']);
    expect(within(table).getAllByRole('cell')).toHaveLength(3);
  });

  it('행 버튼을 누르면 콜백을 부른다', () => {
    const onOpen = vi.fn();
    render(<Example onOpen={onOpen} />);

    fireEvent.click(screen.getByRole('button', { name: '플로디스튜디오' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('열린 행은 행 버튼이 aria-current로 알린다', () => {
    render(<Example selected />);

    expect(
      screen.getByRole('button', { name: '플로디스튜디오' }).getAttribute('aria-current'),
    ).toBe('true');
  });

  it('여러 행 중 열린 행만 aria-current이고 활성 행은 비활성으로 알리지 않는다', () => {
    render(
      <Table.Root aria-label="회원 목록" columns="1fr 1fr">
        <Table.Header>
          <Table.HeaderCell>이름</Table.HeaderCell>
          <Table.HeaderCell>번치</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          {['하람', '경진'].map((name) => (
            <Table.Row key={name} selected={name === '경진'}>
              <Table.Cell>
                <Table.RowButton onClick={() => {}}>{name}</Table.RowButton>
              </Table.Cell>
              <Table.Cell>빵순이들</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>,
    );

    expect(screen.getByRole('button', { name: '하람' }).hasAttribute('aria-current')).toBe(false);
    expect(screen.getByRole('button', { name: '경진' }).getAttribute('aria-current')).toBe('true');
    const rows = within(screen.getAllByRole('rowgroup')[1] as HTMLElement).getAllByRole('row');
    expect(rows.every((row) => !row.hasAttribute('aria-disabled'))).toBe(true);
  });

  // 실제 클릭 가로채기(z-index)는 테스트 DOM이 레이아웃을 계산하지 않아 브라우저에서 확인. 여기서는 칸을 누름 영역 위 층으로 올리는지만 확인
  it('interactive 칸은 행 버튼 누름 영역 위 층에 둔다', () => {
    const onOpen = vi.fn();
    const onMore = vi.fn();
    render(
      <Table.Root aria-label="번치 스팟 목록" columns="1fr 40px">
        <Table.Header>
          <Table.HeaderCell>장소</Table.HeaderCell>
          <Table.HeaderCell>메뉴</Table.HeaderCell>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <Table.RowButton onClick={onOpen}>플로디스튜디오</Table.RowButton>
            </Table.Cell>
            <Table.Cell interactive>
              <button type="button" onClick={onMore}>
                더보기
              </button>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    );

    const cell = screen.getByRole('button', { name: '더보기' }).closest('[role="cell"]');
    expect(cell?.className).toContain('z-30');
    expect(cell?.className).toContain('relative');
  });

  it('비활성 행은 버튼을 누를 수 없고 행이 비활성으로 알린다', () => {
    const onOpen = vi.fn();
    render(<Example onOpen={onOpen} disabled />);

    const button = screen.getByRole('button', { name: '플로디스튜디오' });
    fireEvent.click(button);

    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByRole('row')[1]?.getAttribute('aria-disabled')).toBe('true');
    expect(onOpen).not.toHaveBeenCalled();
  });
});
