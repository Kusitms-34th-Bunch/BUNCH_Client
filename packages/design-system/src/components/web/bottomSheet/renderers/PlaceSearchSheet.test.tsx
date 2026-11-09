import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaceSearchSheet, type PlaceSearchResult } from './PlaceSearchSheet';

afterEach(cleanup);

const setup = (results: readonly PlaceSearchResult[] | undefined) => {
  const onSelect = vi.fn();
  render(
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
      onSelect={onSelect}
    />,
  );
  return { onSelect };
};

describe('PlaceSearchSheet', () => {
  it('검색 전에는 안내를 보여 준다', async () => {
    setup(undefined);

    expect(await screen.findByRole('dialog', { name: '위치 검색' })).toBeTruthy();
    expect(screen.getByText('태그한 위치는 함께 보여요')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('결과가 없으면 문구를 보이고 낭독한다', async () => {
    setup([]);

    expect((await screen.findByRole('status')).textContent).toBe('검색 결과가 없어요');
    expect(screen.queryByText('태그한 위치는 함께 보여요')).toBeNull();
  });

  it('결과를 누르면 그 장소를 알린다', async () => {
    const place = { id: 'a', name: '여의도한강공원', address: '서울 영등포구' };
    const { onSelect } = setup([place]);

    expect((await screen.findByRole('status')).textContent).toBe('검색 결과 1개');
    fireEvent.click(screen.getByRole('button', { name: /여의도한강공원/ }));

    expect(onSelect).toHaveBeenCalledWith(place);
  });
});
