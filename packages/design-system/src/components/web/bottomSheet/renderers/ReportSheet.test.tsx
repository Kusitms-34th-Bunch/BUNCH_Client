import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
});
