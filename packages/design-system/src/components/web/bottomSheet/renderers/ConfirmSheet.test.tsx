import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmSheet } from './ConfirmSheet';

afterEach(cleanup);

describe('ConfirmSheet', () => {
  it('제목이 시트 이름이고 부제·안내 상자는 넘길 때만 보인다', async () => {
    const { rerender } = render(
      <ConfirmSheet
        open
        onOpenChange={() => {}}
        title="여행가조 번치를 차단할까요?"
        notice={'차단하면 번치의 모든 멤버가\n서로의 활동을 볼 수 없어요.'}
        confirmLabel="차단하기"
        onConfirm={() => {}}
      />,
    );

    // 부제가 없으면 안내 상자가 시트 설명
    const sheet = await screen.findByRole('dialog', { name: '여행가조 번치를 차단할까요?' });
    expect(
      document.getElementById(sheet.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toMatch(/서로의 활동을 볼 수 없어요/);

    rerender(
      <ConfirmSheet
        open
        onOpenChange={() => {}}
        title="제목"
        description="부제"
        confirmLabel="확인"
        onConfirm={() => {}}
      />,
    );
    const described = await screen.findByRole('dialog', { name: '제목' });
    expect(
      document.getElementById(described.getAttribute('aria-describedby') ?? '')?.textContent,
    ).toBe('부제');
  });

  it('「취소」는 닫기 요청, 확인은 onConfirm만 부르고 처리 중에는 비활성이다', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmSheet
        open
        onOpenChange={onOpenChange}
        title="차단할까요?"
        confirmLabel="차단하기"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '차단하기' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

    rerender(
      <ConfirmSheet
        open
        onOpenChange={onOpenChange}
        title="차단할까요?"
        confirmLabel="차단하기"
        onConfirm={onConfirm}
        confirming
      />,
    );
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '차단하기' }).disabled).toBe(true);
  });

  it('안내 상자 없이 부제만 넘기면 줄바꿈을 유지하고, 그림 자리 크기를 바꿀 수 있다', async () => {
    render(
      <ConfirmSheet
        open
        onOpenChange={() => {}}
        title="이 장소를 숨길까요?"
        description={'첫 줄\n둘째 줄'}
        illustration={<img alt="" data-testid="illust" />}
        illustrationClassName="size-18"
        confirmLabel="숨기기"
        onConfirm={() => {}}
      />,
    );

    const sheet = await screen.findByRole('dialog', { name: '이 장소를 숨길까요?' });
    const description = document.getElementById(sheet.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toBe('첫 줄\n둘째 줄');
    expect(description?.classList.contains('whitespace-pre-line')).toBe(true);
    expect(screen.getByTestId('illust').parentElement?.classList.contains('size-18')).toBe(true);
    expect(screen.getByTestId('illust').parentElement?.classList.contains('size-23')).toBe(false);
  });
});
