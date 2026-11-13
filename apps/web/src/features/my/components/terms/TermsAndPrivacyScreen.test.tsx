import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/shared/query/testing';
import { TermsAndPrivacyScreen } from './TermsAndPrivacyScreen';

const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace }) }));

beforeEach(() => vi.clearAllMocks());

const renderScreen = (
  consent: boolean,
  onChangeConsent: (_agreed: boolean, _done: () => void) => void = (_agreed, done) => done(),
) => {
  render(<TermsAndPrivacyScreen consent={consent} onChangeConsent={onChangeConsent} />, {
    wrapper: createQueryWrapper(),
  });
  return onChangeConsent;
};
// 확인 창이 열려 있으면 뒤 화면은 보조기술에서 가려지므로 hidden까지 찾음
const toggle = () =>
  screen.getByRole<HTMLInputElement>('switch', {
    name: '추가 개인정보 수집 및 동의',
    hidden: true,
  });

describe('TermsAndPrivacyScreen', () => {
  it('이용약관·개인정보 처리 및 동의 묶음과 약관 링크를 보인다(Figma 6737:45454)', () => {
    renderScreen(false);

    expect(screen.getByRole('heading', { level: 1, name: '약관 및 개인정보' })).toHaveClass(
      'sr-only',
    );
    const items = (title: string) =>
      within(
        screen.getByRole('heading', { level: 2, name: title }).nextElementSibling as HTMLElement,
      )
        .getAllByRole('listitem')
        .map((item) => item.textContent);
    expect(items('이용약관')).toEqual(['서비스 이용약관']);
    expect(items('개인정보 처리 및 동의')[0]).toBe('개인정보 처리방침');
    const href = (name: string | RegExp) => screen.getByRole('link', { name }).getAttribute('href');
    expect(href('서비스 이용약관')).toBe('/my/terms/service');
    expect(href('개인정보 처리방침')).toBe('/my/terms/privacy');
    expect(href(/전문보기/)).toBe('/my/terms/demographics');
  });

  it('토글은 받은 동의 상태를 그대로 보인다', () => {
    const { unmount } = render(<TermsAndPrivacyScreen consent={true} onChangeConsent={vi.fn()} />, {
      wrapper: createQueryWrapper(),
    });
    expect(toggle().checked).toBe(true);
    unmount();

    renderScreen(false);
    expect(toggle().checked).toBe(false);
  });

  it('꺼진 토글을 누르면 동의 확인 창이 뜨고, 동의하기를 눌러야 저장한다(기능명세서 7.4.5)', async () => {
    const user = userEvent.setup();
    const onChange = renderScreen(
      false,
      vi.fn((_agreed: boolean, done: () => void) => done()),
    );

    await user.click(toggle());
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('추가 개인정보 수집에 동의할까요?')).toBeTruthy();
    expect(
      within(dialog).getByText('동의 후 프로필 편집에서 출생연도와 성별을 설정할 수 있어요.'),
    ).toBeTruthy();
    // 누르는 순간에는 바뀌지 않고 저장도 하지 않음
    expect(toggle().checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: '동의하기' }));

    expect(onChange).toHaveBeenCalledWith(true, expect.any(Function));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('켜진 토글을 누르면 철회 확인 창이 뜨고, 동의 철회를 눌러야 저장한다', async () => {
    const user = userEvent.setup();
    const onChange = renderScreen(
      true,
      vi.fn((_agreed: boolean, done: () => void) => done()),
    );

    await user.click(toggle());
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('추가 개인정보 수집 동의를 철회할까요?')).toBeTruthy();
    expect(within(dialog).getByText('철회 시 출생연도와 성별 정보가 삭제돼요.')).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: '동의 철회' }));

    expect(onChange).toHaveBeenCalledWith(false, expect.any(Function));
  });

  it('취소하면 창만 닫고 저장하지 않는다', async () => {
    const user = userEvent.setup();
    const onChange = renderScreen(false, vi.fn());

    await user.click(toggle());
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '취소' }),
    );

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
    expect(toggle().checked).toBe(false);
  });

  it('저장 중에는 동의하기를 다시 누를 수 없다(연타는 첫 탭만)', async () => {
    const user = userEvent.setup();
    const onChange = renderScreen(false, vi.fn());

    await user.click(toggle());
    const confirm = within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: '동의하기',
    });
    await user.click(confirm);
    await user.click(confirm);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('뒤로 가기는 MY로 돌아간다', async () => {
    renderScreen(false);

    await userEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(replace).toHaveBeenCalledWith('/my');
  });
});
