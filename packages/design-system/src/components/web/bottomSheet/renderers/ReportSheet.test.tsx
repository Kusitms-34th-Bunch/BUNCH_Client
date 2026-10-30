import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { ReportSheet } from './ReportSheet';

afterEach(cleanup);

const reasons = [
  { value: 'spam', label: '스팸' },
  { value: 'etc', label: '기타' },
];

const renderSheet = (props: Partial<Parameters<typeof ReportSheet>[0]> = {}) =>
  render(
    <ReportSheet
      open
      onOpenChange={() => {}}
      title="여행가조 번치를 신고해요"
      targetLabel="신고하는 번치"
      targetName="퇴근런클럽"
      reasons={reasons}
      onSubmit={() => {}}
      {...props}
    />,
  );

const submitButton = () => screen.getByRole<HTMLButtonElement>('button', { name: '신고하기' });

describe('ReportSheet', () => {
  it('사유를 고르기 전에는 「신고하기」가 비활성이다', async () => {
    renderSheet();

    expect(await screen.findByRole('dialog', { name: '여행가조 번치를 신고해요' })).toBeTruthy();
    expect(submitButton().disabled).toBe(true);
  });

  it('상세 입력 없는 형태(Figma 08): 사유만 고르면 제출한다', async () => {
    const onSubmit = vi.fn();
    renderSheet({ onSubmit });

    fireEvent.click(await screen.findByRole('radio', { name: '스팸' }));
    fireEvent.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith({ reason: 'spam', detail: '' });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('상세 사유가 필요한 사유(Figma 07)는 입력해야 제출한다', async () => {
    const onSubmit = vi.fn();
    renderSheet({ onSubmit, detailReasonValue: 'etc' });

    fireEvent.click(await screen.findByRole('radio', { name: '기타' }));
    expect(submitButton().disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox', { name: /상세 사유/ }), {
      target: { value: '  광고 글 반복  ' },
    });
    fireEvent.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith({ reason: 'etc', detail: '광고 글 반복' });
  });

  it('고른 사유가 목록에서 빠지면 「신고하기」가 다시 비활성이다', async () => {
    const { rerender } = renderSheet();
    fireEvent.click(await screen.findByRole('radio', { name: '스팸' }));
    expect(submitButton().disabled).toBe(false);

    rerender(
      <ReportSheet
        open
        onOpenChange={() => {}}
        title="여행가조 번치를 신고해요"
        targetLabel="신고하는 번치"
        targetName="퇴근런클럽"
        reasons={[{ value: 'etc', label: '기타' }]}
        onSubmit={() => {}}
      />,
    );

    expect(submitButton().disabled).toBe(true);
  });

  it('닫히는 중 다시 열어도 선택이 지워진다', async () => {
    // 테스트 DOM은 CSS transition을 돌리지 않으므로 끝나지 않는 닫힘 애니메이션으로 시트를 남겨 둠
    const closing = {
      finished: new Promise(() => {}),
      pending: false,
      playState: 'running',
      effect: { getTiming: () => ({ duration: 160, iterations: 1 }) },
    } as unknown as Animation;
    // happy-dom에는 getAnimations가 없어 직접 정의
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: () => [closing],
    });
    onTestFinished(() => {
      delete (Element.prototype as Partial<Element>).getAnimations;
    });
    const Example = () => {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>열기</button>
          <ReportSheet
            open={open}
            onOpenChange={setOpen}
            title="여행가조 번치를 신고해요"
            targetLabel="신고하는 번치"
            targetName="퇴근런클럽"
            reasons={reasons}
            onSubmit={() => {}}
          />
        </>
      );
    };
    render(<Example />);
    fireEvent.click(await screen.findByRole('radio', { name: '스팸' }));

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.getByRole('radio', { name: '스팸', hidden: true })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '열기', hidden: true }));

    expect(submitButton().disabled).toBe(true);
  });
});
