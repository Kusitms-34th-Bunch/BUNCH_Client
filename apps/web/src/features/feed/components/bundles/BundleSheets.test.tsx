import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { FeedBundleMember, FeedPlace } from '../../lib/types';
import { BundleSheets, type BundleSheet } from './BundleSheets';

const toast = vi.fn();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

const places: FeedPlace[] = [
  { id: 'a', name: '애월 한담해변', address: '제주 제주시 애월읍', picked: false },
  { id: 'b', name: '제주 바다', address: '제주 서귀포시', picked: true },
];
const members: FeedBundleMember[] = [
  { name: '은우', role: 'owner' },
  { name: '경진' },
  { name: '탈퇴', role: 'coOwner', left: true },
];
const SHEETS = {
  places: { kind: 'places', places },
  singlePlace: { kind: 'places', places: places.slice(0, 1) },
  members: { kind: 'members', members },
} satisfies Record<string, BundleSheet>;

// 화면처럼 누를 때마다 새 객체를 넘김
function Harness() {
  const [sheet, setSheet] = useState<BundleSheet | null>(null);
  return (
    <>
      <button type="button" onClick={() => setSheet({ ...SHEETS.places })}>
        위치
      </button>
      <button type="button" onClick={() => setSheet({ ...SHEETS.singlePlace })}>
        장소 하나
      </button>
      <button type="button" onClick={() => setSheet({ ...SHEETS.members })}>
        멤버
      </button>
      <BundleSheets sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

const setup = async (
  open: '위치' | '장소 하나' | '멤버',
  bunch: { id: string; name: string } | null = { id: 'bunch-trip', name: '여행가조' },
) => {
  const user = userEvent.setup();
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch });
  render(<Harness />, { wrapper: createQueryWrapper(client) });
  await user.click(screen.getByRole('button', { name: open }));
  return user;
};

const pickButton = (place: string) =>
  screen.getByRole('button', { description: place, name: /콕/ });

beforeEach(() => toast.mockClear());

describe('BundleSheets', () => {
  it('장소마다 이름·주소와 담긴 상태를 보여 준다', async () => {
    await setup('위치');

    expect(screen.getByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(screen.getByText('제주 제주시 애월읍')).toBeTruthy();
    expect(pickButton('애월 한담해변').textContent).toBe('콕하기');
    expect(pickButton('제주 바다').textContent).toBe('콕 했어요');
  });

  it('「콕하기」는 시트를 닫지 않고 「콕 했어요」로 바꾼다', async () => {
    const user = await setup('위치');

    await user.click(pickButton('애월 한담해변'));

    expect(pickButton('애월 한담해변').textContent).toBe('콕 했어요');
    expect(toast).not.toHaveBeenCalled();
  });

  it('「콕 했어요」는 시트를 닫고 확인 창을 열며, 「삭제하기」면 콕을 뺀다', async () => {
    const user = await setup('위치');

    await user.click(pickButton('제주 바다'));

    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    expect(within(dialog).getByText('‘제주 바다’가 번치의 콕한 장소에서 삭제돼요.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: '삭제하기' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(toast).not.toHaveBeenCalled();

    // 초점은 시트를 연 버튼으로 돌아감
    await waitFor(() => expect(screen.getByRole('button', { name: '위치' })).toHaveFocus());

    await user.click(screen.getByRole('button', { name: '위치' }));
    expect(pickButton('제주 바다').textContent).toBe('콕하기');

    // 취소한 장소는 다시 콕할 수 있음
    await user.click(pickButton('제주 바다'));
    expect(pickButton('제주 바다').textContent).toBe('콕 했어요');
  });

  it('위치가 하나여도 같은 시트로 열린다', async () => {
    await setup('장소 하나');

    expect(screen.getByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('시트가 닫히는 중 다시 열면 취소 대상을 버려 확인 창이 뒤늦게 뜨지 않는다', async () => {
    // 테스트 DOM은 CSS transition을 돌리지 않으므로 끝나는 시점을 직접 정하는 애니메이션으로 시트를 남겨 둠
    let finish = () => {};
    const closing = {
      finished: new Promise<void>((resolve) => {
        finish = resolve;
      }),
      pending: false,
      playState: 'running',
      effect: { getTiming: () => ({ duration: 240, iterations: 1 }) },
    } as unknown as Animation;
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: () => [closing],
    });
    onTestFinished(() => {
      delete (Element.prototype as Partial<Element>).getAnimations;
    });
    await setup('위치');

    fireEvent.click(pickButton('제주 바다'));
    fireEvent.click(screen.getByRole('button', { name: '위치', hidden: true }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    finish();

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull(),
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('확인 창의 「아니요」는 창만 닫고 시트를 다시 열지 않으며 콕을 유지한다', async () => {
    const user = await setup('위치');

    await user.click(pickButton('제주 바다'));
    const dialog = await screen.findByRole('alertdialog', { name: '이 장소의 콕을 삭제할까요?' });
    await user.click(within(dialog).getByRole('button', { name: '아니요' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.queryByRole('heading', { name: '어느 장소를 콕할까요?' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '위치' }));
    expect(pickButton('제주 바다').textContent).toBe('콕 했어요');
  });

  it('소속 번치가 없으면 담긴 표시가 없고 눌러도 바뀌지 않으며 안내한다', async () => {
    const user = await setup('위치', null);

    expect(pickButton('제주 바다').textContent).toBe('콕하기');
    await user.click(pickButton('애월 한담해변'));

    expect(pickButton('애월 한담해변').textContent).toBe('콕하기');
    expect(toast).toHaveBeenCalledWith('번치에 참여하면 할 수 있어요.', { position: 'top' });
  });

  it('참여 멤버를 순서대로 보여 주고 나간 멤버는 「작성자」, 역할은 배지로 읽힌다', async () => {
    await setup('멤버');

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['은우', '경진', '작성자']);
    expect(within(items[0]!).getByRole('img', { name: '메인 관리자' })).toBeTruthy();
    // 나간 멤버는 기본 이미지이고 역할 배지 없음
    expect(items[2]!.querySelector('img')?.getAttribute('src')).toContain('deleted-user');
    expect(within(items[2]!).queryByRole('img', { name: '공동 관리자' })).toBeNull();
    // 멤버 프로필은 구현 단위 8이라 어느 행도 버튼이 아님
    expect(within(screen.getByRole('list')).queryByRole('button')).toBeNull();
  });

  it('「취소」를 누르면 시트가 닫힌다', async () => {
    const user = await setup('멤버');

    await user.click(screen.getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: '참여 멤버' })).toBeNull());
  });
});
