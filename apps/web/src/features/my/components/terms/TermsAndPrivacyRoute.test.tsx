import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/shared/query/testing';
import { TermsAndPrivacyRoute } from './TermsAndPrivacyRoute';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), replace: vi.fn() }) }));

beforeEach(() => window.localStorage.clear());

const toggle = () =>
  screen.getByRole<HTMLInputElement>('switch', {
    name: '추가 개인정보 수집 및 동의',
    hidden: true,
  });

describe('TermsAndPrivacyRoute', () => {
  it('동의하기를 누르면 토글이 켜지고 이 기기에 저장된다(서버 API 연결 전 임시)', async () => {
    const user = userEvent.setup();
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper() });
    expect(toggle().checked).toBe(false);

    await user.click(toggle());
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '동의하기' }),
    );

    await waitFor(() => expect(toggle().checked).toBe(true));
    expect(window.localStorage.getItem('bunch:demographics-consent')).toBe('true');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('켜진 상태에서 동의 철회를 누르면 꺼진다', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('bunch:demographics-consent', 'true');
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper() });
    expect(toggle().checked).toBe(true);

    await user.click(toggle());
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '동의 철회' }),
    );

    await waitFor(() => expect(toggle().checked).toBe(false));
  });
});
