import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaceSearch, type PlaceSearchResult, type PlaceSearchStatus } from './PlaceSearch';

afterEach(cleanup);

const RESULTS: PlaceSearchResult[] = [
  {
    id: 'a',
    name: '플로디스튜디오 연남점',
    category: '공방',
    address: '서울 마포구 연남로 12, 2층',
  },
  { id: 'b', name: '플로디스튜디오 성수점', category: '공방', address: '서울 성동구 서울숲2길 7' },
];

const COPY = {
  label: '장소검색',
  emptyTitle: "'플로디'에 대한 검색 결과가 없어요",
  loadingLabel: '장소를 찾는 중',
};

const Example = ({
  status,
  ...props
}: { status: PlaceSearchStatus } & Partial<ComponentProps<typeof PlaceSearch>>) => {
  const [query, setQuery] = useState('');
  return (
    <PlaceSearch
      {...COPY}
      query={query}
      onQueryChange={setQuery}
      status={status}
      results={status === 'results' ? RESULTS : []}
      onSelect={vi.fn()}
      {...props}
    />
  );
};

describe('PlaceSearch', () => {
  it('라벨이 연결된 combobox이고 필수면 aria-required로 알린다', () => {
    render(<Example status="idle" required />);

    const input = screen.getByRole('combobox', { name: '장소검색' });
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('검색어를 입력하면 onQueryChange를 부른다', async () => {
    const onQueryChange = vi.fn();
    render(<Example status="idle" onQueryChange={onQueryChange} query="" />);

    await userEvent.setup().type(screen.getByRole('combobox', { name: '장소검색' }), '플');

    expect(onQueryChange).toHaveBeenCalledWith('플');
  });

  it('결과를 보여 주고 고르면 onSelect를 부른다', async () => {
    const onSelect = vi.fn();
    render(<Example status="results" onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.type(screen.getByRole('combobox', { name: '장소검색' }), '플로디');
    await user.click(await screen.findByRole('option', { name: /성수점/ }));

    expect(onSelect).toHaveBeenCalledWith(RESULTS[1]);
  });

  it('받는 중에는 받는 중임을 알린다', async () => {
    render(<Example status="loading" />);

    await userEvent.setup().type(screen.getByRole('combobox', { name: '장소검색' }), '플로디');

    expect((await screen.findByRole('status')).textContent).toContain('장소를 찾는 중');
  });

  it('결과가 없으면 안내와 직접 입력 버튼을 보여 준다', async () => {
    const onManualInput = vi.fn();
    render(
      <Example status="empty" manualInput={{ label: '직접 입력하기', onClick: onManualInput }} />,
    );

    await userEvent.setup().type(screen.getByRole('combobox', { name: '장소검색' }), '플로디');
    expect((await screen.findByRole('status')).textContent).toContain(COPY.emptyTitle);
    fireEvent.click(screen.getByRole('button', { name: '직접 입력하기' }));

    expect(onManualInput).toHaveBeenCalledTimes(1);
  });

  it('고른 장소를 보여 주고 변경을 누르면 onChangeSelected를 부른다', () => {
    const onChangeSelected = vi.fn();
    render(
      <Example
        status="idle"
        selected={{ name: '플로디스튜디오 연남점', address: '서울 마포구 연남로 12, 2층' }}
        onChangeSelected={onChangeSelected}
      />,
    );

    expect(screen.getByText('플로디스튜디오 연남점')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    expect(onChangeSelected).toHaveBeenCalledTimes(1);
  });

  it('키보드로 ↓·Enter를 눌러 결과를 고른다', async () => {
    const onSelect = vi.fn();
    render(<Example status="results" onSelect={onSelect} />);
    const user = userEvent.setup();

    await user.type(screen.getByRole('combobox', { name: '장소검색' }), '플로디');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(RESULTS[1]);
  });

  it('결과가 나오면 건수를 알린다', async () => {
    render(<Example status="results" formatResultsLabel={(count) => `결과 ${count}건`} />);

    await userEvent.setup().type(screen.getByRole('combobox', { name: '장소검색' }), '플로디');

    expect((await screen.findByRole('status')).textContent).toContain('결과 2건');
  });

  it('결과 없음의 직접 입력 버튼은 Tab으로 닿는다', async () => {
    render(<Example status="empty" manualInput={{ label: '직접 입력하기', onClick: vi.fn() }} />);
    const user = userEvent.setup();

    await user.type(screen.getByRole('combobox', { name: '장소검색' }), '플로디');
    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '직접 입력하기' }));
  });

  it('변경을 누르면 입력칸으로 초점을 옮긴다', () => {
    render(
      <Example
        status="idle"
        selected={{ name: '플로디스튜디오 연남점', address: '서울 마포구 연남로 12, 2층' }}
        onChangeSelected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '변경' }));

    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '장소검색' }));
  });

  it('검색 → 고르기 → 다시 입력 → Esc로 패널 자리 하나의 내용이 바뀐다', async () => {
    const WithSelection = () => {
      const [query, setQuery] = useState('');
      const [selected, setSelected] = useState<PlaceSearchResult | null>(null);
      return (
        <PlaceSearch
          {...COPY}
          query={query}
          onQueryChange={setQuery}
          status={query ? 'results' : 'idle'}
          results={RESULTS}
          onSelect={setSelected}
          selected={selected}
        />
      );
    };
    render(<WithSelection />);
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: '장소검색' });
    expect(input.getAttribute('aria-expanded')).toBe('false');

    // 검색하면 결과 목록, 펼쳐짐
    await user.type(input, '플로디');
    expect(await screen.findAllByRole('option')).toHaveLength(2);
    expect(input.getAttribute('aria-expanded')).toBe('true');

    // 고르면 입력칸에 이름, 같은 자리에 장소 칸, 접힘
    await user.click(screen.getByRole('option', { name: /연남점/ }));
    expect(input).toHaveProperty('value', '플로디스튜디오 연남점');
    expect(screen.getByRole('button', { name: '변경' })).toBeTruthy();
    expect(screen.queryByRole('option')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');

    // 다시 입력하면 검색 패널로
    await user.type(input, ' 성수');
    expect(screen.queryByRole('button', { name: '변경' })).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(2);

    // Esc는 고른 장소 이름으로 되돌려 장소 칸으로
    await user.keyboard('{Escape}');
    expect(input).toHaveProperty('value', '플로디스튜디오 연남점');
    expect(screen.getByRole('button', { name: '변경' })).toBeTruthy();
  });

  it('고른 장소와 같은 이름의 결과가 있어도 다시 입력하면 고를 수 있다', async () => {
    const SELECTED = { name: '플로디스튜디오 연남점', address: '서울 마포구 연남로 12, 2층' };
    const Example2 = () => {
      const [query, setQuery] = useState(SELECTED.name);
      return (
        <PlaceSearch
          {...COPY}
          query={query}
          onQueryChange={setQuery}
          status="results"
          results={RESULTS}
          onSelect={vi.fn()}
          selected={SELECTED}
        />
      );
    };
    render(<Example2 />);

    // 이름이 같아도 입력하기 전에는 장소 칸
    expect(screen.queryByRole('option')).toBeNull();
    await userEvent.setup().type(screen.getByRole('combobox', { name: '장소검색' }), ' ');

    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('변경을 누르면 입력칸을 비우고, 입력 없이 벗어나거나 Esc면 고른 장소로 되돌린다', async () => {
    const SELECTED = { name: '플로디스튜디오 연남점', address: '서울 마포구 연남로 12, 2층' };
    const WithSelected = () => {
      const [query, setQuery] = useState(SELECTED.name);
      return (
        <>
          <PlaceSearch
            {...COPY}
            query={query}
            onQueryChange={setQuery}
            status={query ? 'results' : 'idle'}
            results={RESULTS}
            onSelect={vi.fn()}
            selected={SELECTED}
          />
          <button type="button">다음</button>
        </>
      );
    };
    render(<WithSelected />);
    const user = userEvent.setup();
    const input = screen.getByRole<HTMLInputElement>('combobox', { name: '장소검색' });

    // 변경: 입력칸 비움·초점, 장소 칸 숨김
    await user.click(screen.getByRole('button', { name: '변경' }));
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('');
    expect(screen.queryByRole('button', { name: '변경' })).toBeNull();

    // 입력 없이 벗어나면 되돌림
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(input.value).toBe(SELECTED.name);
    expect(screen.getByRole('button', { name: '변경' })).toBeTruthy();

    // Esc도 되돌림
    await user.click(screen.getByRole('button', { name: '변경' }));
    await user.keyboard('{Escape}');
    expect(input.value).toBe(SELECTED.name);
    expect(screen.getByRole('button', { name: '변경' })).toBeTruthy();
  });

  it('변경 뒤 빈 검색어에도 결과가 남아 있으면 결과를 눌러 고를 수 있다', async () => {
    const SELECTED = { name: '플로디스튜디오 연남점', address: '서울 마포구 연남로 12, 2층' };
    const onSelect = vi.fn();
    const StaleResults = () => {
      const [query, setQuery] = useState(SELECTED.name);
      return (
        <PlaceSearch
          {...COPY}
          query={query}
          onQueryChange={setQuery}
          status="results"
          results={RESULTS}
          onSelect={onSelect}
          selected={SELECTED}
        />
      );
    };
    render(<StaleResults />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '변경' }));
    await user.click(screen.getByRole('option', { name: /성수점/ }));

    expect(onSelect).toHaveBeenCalledWith(RESULTS[1]);
  });

  it('호출자가 렌더마다 새 객체로 고른 장소를 넘겨도 다시 입력하는 동안 검색 패널을 유지한다', async () => {
    const PLACE = { name: '플로디스튜디오 연남점', address: '서울 마포구 연남로 12, 2층' };
    const FreshObject = () => {
      const [query, setQuery] = useState(PLACE.name);
      return (
        <PlaceSearch
          {...COPY}
          query={query}
          onQueryChange={setQuery}
          status="results"
          results={RESULTS}
          onSelect={vi.fn()}
          selected={{ name: PLACE.name, address: PLACE.address }}
        />
      );
    };
    render(<FreshObject />);

    await userEvent.setup().type(screen.getByRole('combobox', { name: '장소검색' }), ' 성');

    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '변경' })).toBeNull();
  });

  it('패널이 떠 있는 동안 받는 중에서 결과로 바뀌어도 상자는 그대로 두고 내용만 바꾼다', () => {
    const { rerender } = render(<Example status="loading" query="플로디" />);
    const box = screen.getByRole('combobox', { name: '장소검색' }).closest('div')
      ?.nextElementSibling?.firstElementChild;
    expect(box).toBeTruthy();

    rerender(<Example status="results" query="플로디" />);

    expect(
      screen.getByRole('combobox', { name: '장소검색' }).closest('div')?.nextElementSibling
        ?.firstElementChild,
    ).toBe(box);
  });

  it('패널이 완전히 없어질 때는 마지막 내용을 누를 수 없게 잠깐 남겼다가 지운다', async () => {
    const Controlled = () => {
      const [query, setQuery] = useState('');
      return (
        <PlaceSearch
          {...COPY}
          query={query}
          onQueryChange={setQuery}
          status={query ? 'results' : 'idle'}
          results={RESULTS}
          onSelect={vi.fn()}
        />
      );
    };
    render(<Controlled />);
    const user = userEvent.setup();
    const input = screen.getByRole('combobox', { name: '장소검색' });

    await user.type(input, '플로디');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await user.clear(input);

    // 사라지는 동안: 선택할 수 있는 결과는 없고, 남은 사본은 읽히지 않음
    expect(screen.queryByRole('option')).toBeNull();
    const leaving = document.querySelector('[data-leaving]');
    expect(leaving?.getAttribute('aria-hidden')).toBe('true');
    await waitFor(() => expect(document.querySelector('[data-leaving]')).toBeNull());
  });
});
