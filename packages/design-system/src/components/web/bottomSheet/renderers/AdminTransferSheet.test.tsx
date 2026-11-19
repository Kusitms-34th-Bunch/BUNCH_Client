import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminTransferSheet } from './AdminTransferSheet';

afterEach(cleanup);

describe('AdminTransferSheet', () => {
  it('멤버 이름으로 제목과 부제를 만든다', async () => {
    render(
      <AdminTransferSheet open onOpenChange={() => {}} memberName="경진" onConfirm={() => {}} />,
    );

    const sheet = await screen.findByRole('dialog', {
      name: '경진님을 관리자로 지정하고 나갈까요?',
    });
    // 부제와 안내(기능명세 5.8.2 원문)가 모두 시트 설명으로 연결됨
    const described = (sheet.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual([
      '경진님이 번치의 모든 관리 권한을 갖게 돼요.',
      '사진함에 직접 올린 사진은 삭제되지만, 이미 발행된 번들의 사진은 그대로 남아요.',
    ]);
  });

  it('「취소」는 닫기 요청, 「나가기」는 onConfirm만 부른다', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <AdminTransferSheet
        open
        onOpenChange={onOpenChange}
        memberName="경진"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '나가기' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('처리 중에는 「나가기」를 누를 수 없다', async () => {
    render(
      <AdminTransferSheet
        open
        onOpenChange={() => {}}
        memberName="경진"
        onConfirm={() => {}}
        confirming
      />,
    );

    expect(
      (await screen.findByRole<HTMLButtonElement>('button', { name: '나가기' })).disabled,
    ).toBe(true);
  });
});
