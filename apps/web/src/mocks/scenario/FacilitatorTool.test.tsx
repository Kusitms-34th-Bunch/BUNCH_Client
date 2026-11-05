import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '../db/seed';
import { FacilitatorTool } from './FacilitatorTool';

let pathname = '/bunch';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

const navigate = vi.fn();
const WAIT = { timeout: 4000 };

const tapArea = () => screen.getByTestId('facilitator-tap-area');
const tap = (times: number) => {
  for (let i = 0; i < times; i += 1) fireEvent.pointerDown(tapArea());
};
const open = () => {
  tap(7);
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
});

describe('진행자 장치', () => {
  it('보이지 않는 영역을 7번 연달아 누르면 열리고, 6번까지는 열리지 않는다', async () => {
    render(<FacilitatorTool navigate={navigate} />);

    expect(tapArea()).toHaveAttribute('aria-hidden', 'true');
    tap(6);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    expect(await open()).toBeInTheDocument();
  });

  it('작성 화면이 아니면 「상태 B로 되돌리기」는 비활성이고 「상태 A로 초기화」는 쓸 수 있다', async () => {
    render(<FacilitatorTool navigate={navigate} />);

    await open();

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
    render(<FacilitatorTool navigate={navigate} />);

    await open();
    fireEvent.click(screen.getByRole('button', { name: '상태 A로 초기화' }));

    expect(mockDb.get().bundles.every((bundle) => bundle.status === 'PUBLISHED')).toBe(true);
    expect(sessionStorage.getItem('x')).toBeNull();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/bunch'), WAIT);
  });
});
