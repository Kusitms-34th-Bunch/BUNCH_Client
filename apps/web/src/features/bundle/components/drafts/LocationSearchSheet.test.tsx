import type * as DesignSystem from '@app/design-system';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlaceResult } from '../../lib/types';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { fixturePlace } from '../../fixtures/draft.fixture';
import { LocationSearchSheet, SEARCH_DEBOUNCE_MS } from './LocationSearchSheet';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const place = fixturePlace('p1', '여의도한강공원', '서울특별시 영등포구 여의동로 330');

type Search = (_keyword: string, _signal?: AbortSignal) => Promise<readonly PlaceResult[]>;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const renderSheet = (searchPlaces: Search, onSelect = vi.fn()) => {
  render(
    <LocationSearchSheet
      open
      onOpenChange={vi.fn()}
      onOpenChangeComplete={vi.fn()}
      searchPlaces={searchPlaces}
      onSelect={onSelect}
    />,
  );
  return { onSelect };
};

const searchbox = () => screen.findByRole('searchbox', { name: '장소나 주소 검색' });
const guide = () => screen.queryByText(BUNDLE_MESSAGES.locationGuideTitle);

// 시트가 열린 뒤에 타이머만 가상으로 바꿔, 입력 멈춤 시간(400ms)의 전후를 시간으로 직접 제어함
const withFakeTimers = async () => {
  const input = await searchbox();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  // Testing Library는 `jest` 전역이 있어야 가상 타이머를 알아보고 비동기 대기가 멈추지 않음(vitest에서도 같은 방식)
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, delay: null });
  return { input, user };
};
// 가상 시간을 흐르게 하고 그 사이 끝난 응답·렌더까지 반영함
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe('LocationSearchSheet', () => {
  it('두 글자 이상이면 Enter 없이 입력이 멈춘 뒤 자동으로 검색한다', async () => {
    const searchPlaces = vi.fn<Search>().mockResolvedValue([place]);
    renderSheet(searchPlaces);
    const { input, user } = await withFakeTimers();

    await user.type(input, '여의');
    await advance(SEARCH_DEBOUNCE_MS - 1);
    // 입력이 멈춘 뒤 400ms가 되기 전에는 요청하지 않음
    expect(searchPlaces).not.toHaveBeenCalled();

    await advance(1);

    // 글자마다 요청하지 않고 입력이 멈춘 뒤 한 번만 요청
    expect(searchPlaces).toHaveBeenCalledTimes(1);
    expect(searchPlaces).toHaveBeenCalledWith('여의', expect.any(AbortSignal));
    expect(screen.getByText('여의도한강공원')).toBeInTheDocument();
  });

  it('한 글자만으로는 검색하지 않고 처음 안내를 보인다', async () => {
    const searchPlaces = vi.fn<Search>().mockResolvedValue([place]);
    renderSheet(searchPlaces);
    const { input, user } = await withFakeTimers();

    await user.type(input, '여');
    await advance(SEARCH_DEBOUNCE_MS * 2);

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(guide()).toBeInTheDocument();
  });

  it('글자를 모두 지우면 결과를 없애고 처음 안내를 다시 보인다', async () => {
    const searchPlaces = vi.fn<Search>().mockResolvedValue([place]);
    renderSheet(searchPlaces);
    const { input, user } = await withFakeTimers();
    await user.type(input, '여의도');
    await advance(SEARCH_DEBOUNCE_MS);
    expect(screen.getByText('여의도한강공원')).toBeInTheDocument();

    await user.clear(input);

    expect(screen.queryByText('여의도한강공원')).not.toBeInTheDocument();
    expect(guide()).toBeInTheDocument();
  });

  it('한 글자로 줄여도 이전 결과를 지우고 안내를 보인다', async () => {
    const searchPlaces = vi.fn<Search>().mockResolvedValue([place]);
    renderSheet(searchPlaces);
    const { input, user } = await withFakeTimers();
    await user.type(input, '여의');
    await advance(SEARCH_DEBOUNCE_MS);
    expect(screen.getByText('여의도한강공원')).toBeInTheDocument();

    await user.type(input, '{Backspace}');

    expect(screen.queryByText('여의도한강공원')).not.toBeInTheDocument();
    expect(guide()).toBeInTheDocument();
  });

  it('이전 검색의 늦은 응답은 버리고 마지막 검색 결과만 보인다', async () => {
    let resolveFirst: (_found: readonly PlaceResult[]) => void = () => {};
    const searchPlaces = vi
      .fn<Search>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce([
        fixturePlace('p2', '더현대 서울', '서울특별시 영등포구 여의대로 108'),
      ]);
    renderSheet(searchPlaces);
    const { input, user } = await withFakeTimers();
    await user.type(input, '여의');
    await advance(SEARCH_DEBOUNCE_MS);
    expect(searchPlaces).toHaveBeenCalledTimes(1);

    await user.type(input, '도');
    await advance(SEARCH_DEBOUNCE_MS);
    expect(screen.getByText('더현대 서울')).toBeInTheDocument();

    // 처음 요청의 응답이 뒤늦게 와도 반영하지 않음
    resolveFirst([place]);
    await advance(0);

    expect(screen.queryByText('여의도한강공원')).not.toBeInTheDocument();
    expect(screen.getByText('더현대 서울')).toBeInTheDocument();
  });

  it('검색이 실패하면 오류 토스트를 띄우고, Enter로 같은 검색어를 다시 검색한다', async () => {
    const searchPlaces = vi
      .fn<Search>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([place]);
    renderSheet(searchPlaces);
    const { input, user } = await withFakeTimers();

    await user.type(input, '여의도{Enter}');
    // Enter는 입력 멈춤을 기다리지 않고 바로 검색
    await advance(0);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.searchFailed);

    // 입력창 값을 바꾸지 않고 한 번 더 검색
    await user.type(input, '{Enter}');
    await advance(0);

    expect(searchPlaces).toHaveBeenCalledTimes(2);
    expect(searchPlaces).toHaveBeenNthCalledWith(2, '여의도', expect.any(AbortSignal));
    expect(screen.getByText('여의도한강공원')).toBeInTheDocument();
  });

  it('결과를 누르면 provider·externalId가 든 장소로 정한다', async () => {
    const searchPlaces = vi.fn<Search>().mockResolvedValue([place]);
    const { onSelect } = renderSheet(searchPlaces);
    const { input, user } = await withFakeTimers();
    await user.type(input, '여의도{Enter}');
    await advance(0);

    await user.click(screen.getByRole('button', { name: /여의도한강공원/ }));

    expect(onSelect).toHaveBeenCalledWith(place);
  });
});
