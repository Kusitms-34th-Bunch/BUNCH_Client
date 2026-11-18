import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaceSearchSheet, type PlaceSearchResult } from './PlaceSearchSheet';

afterEach(cleanup);

const sheet = (
  results: readonly PlaceSearchResult[] | undefined,
  onQueryChange: ((_query: string) => void) | undefined,
  onSelect: () => void,
) => (
  <PlaceSearchSheet
    open
    onOpenChange={() => {}}
    title="위치 검색"
    inputLabel="장소 검색"
    placeholder="장소나 주소를 검색해 주세요"
    guideTitle="태그한 위치는 함께 보여요"
    guideDescription="안내"
    noResultLabel="검색 결과가 없어요"
    resultCountLabel={(count) => `검색 결과 ${count}개`}
    results={results}
    onSearch={() => {}}
    onQueryChange={onQueryChange}
    onSelect={onSelect}
  />
);

const setup = (
  results: readonly PlaceSearchResult[] | undefined,
  onQueryChange?: (_query: string) => void,
) => {
  const onSelect = vi.fn();
  const view = render(sheet(results, onQueryChange, onSelect));
  const update = (next: readonly PlaceSearchResult[] | undefined) =>
    view.rerender(sheet(next, onQueryChange, onSelect));
  return { onSelect, update };
};

const status = () => screen.getByRole('status').textContent;

describe('PlaceSearchSheet', () => {
  it('검색 전에는 안내를 보여 준다', async () => {
    setup(undefined);

    expect(await screen.findByRole('dialog', { name: '위치 검색' })).toBeTruthy();
    expect(screen.getByText('태그한 위치는 함께 보여요')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('결과가 없으면 문구를 보이고 낭독한다', async () => {
    setup([]);

    await waitFor(() => expect(status()).toBe('검색 결과가 없어요'));
    expect(screen.queryByText('태그한 위치는 함께 보여요')).toBeNull();
  });

  it('입력값이 바뀔 때마다 onQueryChange로 현재 입력값을 알린다', async () => {
    const onQueryChange = vi.fn();
    setup(undefined, onQueryChange);

    const input = await screen.findByRole('searchbox', { name: '장소 검색' });
    fireEvent.change(input, { target: { value: '여의' } });
    fireEvent.change(input, { target: { value: '여의도' } });

    expect(onQueryChange).toHaveBeenNthCalledWith(1, '여의');
    expect(onQueryChange).toHaveBeenNthCalledWith(2, '여의도');
  });

  it('결과를 누르면 그 장소를 알린다', async () => {
    const place = { id: 'a', name: '여의도한강공원', address: '서울 영등포구' };
    const { onSelect } = setup([place]);

    await waitFor(() => expect(status()).toBe('검색 결과 1개'));
    fireEvent.click(screen.getByRole('button', { name: /여의도한강공원/ }));

    expect(onSelect).toHaveBeenCalledWith(place);
  });

  it('결과 수가 같아도 새 검색이면 낭독 영역을 비웠다가 다시 채운다', async () => {
    const place = { id: 'a', name: '여의도한강공원', address: '서울 영등포구' };
    const { update } = setup([place]);
    await waitFor(() => expect(status()).toBe('검색 결과 1개'));

    update([{ ...place, id: 'b' }]);

    // 문구가 같아도 한 번 비워져야 보조기기가 다시 읽음
    await waitFor(() => expect(status()).toBe(''));
    await waitFor(() => expect(status()).toBe('검색 결과 1개'));
  });

  it('결과를 지워 안내로 돌아가면 안내 제목을 낭독한다', async () => {
    const place = { id: 'a', name: '여의도한강공원', address: '서울 영등포구' };
    const { update } = setup([place]);
    await waitFor(() => expect(status()).toBe('검색 결과 1개'));

    update(undefined);

    await waitFor(() => expect(status()).toBe('태그한 위치는 함께 보여요'));
  });
});
