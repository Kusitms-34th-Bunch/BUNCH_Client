import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { startNewAnalyticsUser } from '@/shared/config/posthog';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '../db/seed';
import { FacilitatorTool } from './FacilitatorTool';

vi.mock('@/shared/config/posthog', () => ({
  startNewAnalyticsUser: vi.fn(() => Promise.resolve()),
}));

let pathname = '/bunch';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const navigate = vi.fn();
const WAIT = { timeout: 4000 };

const tapArea = () => screen.getByTestId('facilitator-tap-area');
const DRAFT_PATH = '/bunch/drafts/1';
const tap = (times: number) => {
  for (let i = 0; i < times; i += 1) fireEvent.pointerDown(tapArea());
};
const open = () => {
  tap(5);
  return screen.findByRole('alertdialog', { name: '진행자 메뉴' });
};

// 작성 화면이 아닌 번치 홈에서 캐릭터 자리를 5번 눌러 여는 흐름
const openFromCharacter = () => {
  render(
    <>
      <FacilitatorTool navigate={navigate} />
      <div data-testid="character" data-facilitator-trigger="bunch-character" />
    </>,
  );
  for (let i = 0; i < 5; i += 1) fireEvent.pointerDown(screen.getByTestId('character'));
  return screen.findByRole('alertdialog', { name: '진행자 메뉴' });
};

const createStateB = async () => {
  const { P1, P2, P3, P4 } = MOCK_PHOTO_IDS;
  const response = await fetch(`/api/bunches/${MOCK_BUNCH_ID}/bundles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': createIdempotencyKey() },
    body: JSON.stringify({ photoIds: [P1, P2, P3, P4] }),
  });
  return ((await response.json()) as { data: { id: number } }).data.id;
};

beforeEach(() => {
  pathname = '/bunch';
  navigate.mockClear();
  vi.mocked(startNewAnalyticsUser).mockClear();
});

describe('진행자 장치', () => {
  it('작성 화면의 보이지 않는 영역을 5번 연달아 누르면 열리고, 4번까지는 열리지 않는다', async () => {
    pathname = DRAFT_PATH;
    render(<FacilitatorTool navigate={navigate} />);

    expect(tapArea()).toHaveAttribute('aria-hidden', 'true');
    tap(4);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    expect(await open()).toBeInTheDocument();
  });

  it('번치 홈의 캐릭터를 5번 연달아 누르면 열리고, 4번까지는 열리지 않는다', async () => {
    render(
      <>
        <FacilitatorTool navigate={navigate} />
        <div data-testid="character" data-facilitator-trigger="bunch-character" />
      </>,
    );

    for (let i = 0; i < 4; i += 1) fireEvent.pointerDown(screen.getByTestId('character'));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    fireEvent.pointerDown(screen.getByTestId('character'));

    expect(await screen.findByRole('alertdialog', { name: '진행자 메뉴' })).toBeInTheDocument();
  });

  it('작성 화면이 아니면 위쪽 열기 영역이 없다', () => {
    render(<FacilitatorTool navigate={navigate} />);

    expect(screen.queryByTestId('facilitator-tap-area')).not.toBeInTheDocument();
  });

  it('표식이 없는 곳을 연달아 눌러도 열리지 않는다', () => {
    render(
      <>
        <FacilitatorTool navigate={navigate} />
        <div data-testid="other" />
      </>,
    );

    for (let i = 0; i < 8; i += 1) fireEvent.pointerDown(screen.getByTestId('other'));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('작성 화면이 아니면 「상태 B로 되돌리기」는 비활성이고 「상태 A로 초기화」는 쓸 수 있다', async () => {
    await openFromCharacter();

    expect(screen.getByRole('button', { name: '상태 B로 되돌리기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '상태 A로 초기화' })).toBeEnabled();
  });

  it('작성 화면에서 「상태 B로 되돌리기」를 누르면 지금 초안이 상태 B로 돌아가고 같은 화면을 새로 불러온다', async () => {
    const id = await createStateB();
    mockDb.update((state) => ({
      ...state,
      bundles: state.bundles.map((bundle) =>
        bundle.id === id ? { ...bundle, title: '내가 바꾼 제목', participants: [] } : bundle,
      ),
    }));
    pathname = `/bunch/drafts/${id}`;
    render(<FacilitatorTool navigate={navigate} />);

    await open();
    fireEvent.click(screen.getByRole('button', { name: '상태 B로 되돌리기' }));

    const restored = mockDb.get().bundles.find((bundle) => bundle.id === id)!;
    expect(restored.title).toBe('속초 첫째 날 🌊');
    expect(restored.participants).toHaveLength(3);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`/bunch/drafts/${id}`), WAIT);
  });

  it('「상태 A로 초기화」를 누르면 가짜 DB가 시작 데이터로 돌아가고 번치 홈에서 다시 시작한다', async () => {
    await createStateB();
    sessionStorage.setItem('x', '1');
    await openFromCharacter();
    fireEvent.click(screen.getByRole('button', { name: '상태 A로 초기화' }));

    expect(mockDb.get().bundles.every((bundle) => bundle.status === 'PUBLISHED')).toBe(true);
    expect(sessionStorage.getItem('x')).toBeNull();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/bunch'), WAIT);
    // 다음 회차 클릭 기록이 앞 회차 사용자에 섞이지 않게 분석 사용자를 바꾼 뒤 이동
    expect(startNewAnalyticsUser).toHaveBeenCalledTimes(1);
  });
});
