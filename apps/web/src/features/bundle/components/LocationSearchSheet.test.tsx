import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceResult } from '../lib/types';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { LocationSearchSheet } from './LocationSearchSheet';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const place: PlaceResult = {
  id: 'p1',
  name: '여의도한강공원',
  address: '서울특별시 영등포구 여의동로 330',
};

beforeEach(() => {
  vi.clearAllMocks();
});

const renderSheet = (searchPlaces: (_keyword: string) => Promise<readonly PlaceResult[]>) =>
  render(
    <LocationSearchSheet
      open
      onOpenChange={vi.fn()}
      searchPlaces={searchPlaces}
      onSelect={vi.fn()}
    />,
  );

describe('LocationSearchSheet', () => {
  it('검색이 실패해 안내가 뜬 뒤 같은 검색어로 다시 검색하면 다시 요청한다', async () => {
    const searchPlaces = vi
      .fn<(_keyword: string) => Promise<readonly PlaceResult[]>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([place]);
    renderSheet(searchPlaces);

    const input = await screen.findByRole('searchbox', { name: '장소나 주소 검색' });
    await userEvent.type(input, '여의도{Enter}');
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.searchFailed, { fullWidth: true }),
    );

    // 입력창 값을 바꾸지 않고 한 번 더 검색
    await userEvent.type(input, '{Enter}');

    expect(searchPlaces).toHaveBeenCalledTimes(2);
    expect(searchPlaces).toHaveBeenNthCalledWith(2, '여의도');
    expect(await screen.findByText('여의도한강공원')).toBeInTheDocument();
  });
});
