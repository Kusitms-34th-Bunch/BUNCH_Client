import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { myKeys } from '../../queries/keys';
import { TermsAndPrivacyRoute } from './TermsAndPrivacyRoute';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), replace: vi.fn() }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

beforeEach(() => vi.mocked(toast).mockClear());

const FAILED = '일시적인 오류가 발생했어요. 다시 시도해 주세요';

const toggle = () =>
  screen.getByRole<HTMLInputElement>('switch', {
    name: '추가 개인정보 수집 및 이용 동의',
    hidden: true,
  });

const me = () => mockDb.get().members.find((member) => member.memberId === MOCK_MY_MEMBER_ID);

const setConsent = (consented: boolean) =>
  mockDb.update((state) => ({
    ...state,
    members: state.members.map((member) =>
      member.memberId === MOCK_MY_MEMBER_ID
        ? { ...member, additionalInfoConsented: consented, birthYear: consented ? 2003 : null }
        : member,
    ),
  }));

const confirmInDialog = async (name: string) =>
  userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name }));

describe('TermsAndPrivacyRoute', () => {
  it('서버 동의 상태를 받기 전에는 토글을 누를 수 없고, 받으면 그 상태로 보인다', async () => {
    setConsent(true);
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper() });
    expect(toggle().disabled).toBe(true);

    await waitFor(() => expect(toggle().checked).toBe(true));
    expect(toggle().disabled).toBe(false);
  });

  it('동의하기를 누르면 서버에 동의를 저장하고 토글이 켜진다', async () => {
    const user = userEvent.setup();
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(toggle().disabled).toBe(false));
    expect(toggle().checked).toBe(false);

    await user.click(toggle());
    await confirmInDialog('동의하기');

    await waitFor(() => expect(toggle().checked).toBe(true));
    expect(me()?.additionalInfoConsented).toBe(true);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('켜진 상태에서 동의 철회를 누르면 꺼지고 서버가 출생연도·성별을 지운다', async () => {
    setConsent(true);
    const user = userEvent.setup();
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(toggle().checked).toBe(true));

    await user.click(toggle());
    await confirmInDialog('동의 철회');

    await waitFor(() => expect(toggle().checked).toBe(false));
    expect(me()).toMatchObject({ additionalInfoConsented: false, birthYear: null });
  });

  it('동의 상태를 불러오지 못하면 토스트를 띄우고 토글을 누를 수 없게 둔다(기능명세서 7.4.4)', async () => {
    server.use(http.get('/api/members/me/additional-info', () => fail(500, 'COMMON_500')));
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper() });

    await waitFor(() => expect(toast).toHaveBeenCalledWith(FAILED));
    expect(toggle().disabled).toBe(true);
  });

  it('받아 둔 값이 있어도 다시 받기에 실패하면 토글을 누를 수 없게 둔다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(myKeys.additionalInfo(), { consented: true });
    server.use(http.get('/api/members/me/additional-info', () => fail(500, 'COMMON_500')));
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper(client) });

    await waitFor(() => expect(toast).toHaveBeenCalledWith(FAILED));
    expect(toggle().checked).toBe(true);
    expect(toggle().disabled).toBe(true);
  });

  it('저장에 실패하면 토스트를 띄우고 토글은 원래 상태로 둔다(기능명세서 7.4.5)', async () => {
    server.use(http.put('/api/members/me/additional-info-consent', () => fail(500, 'COMMON_500')));
    const user = userEvent.setup();
    render(<TermsAndPrivacyRoute />, { wrapper: createQueryWrapper() });
    await waitFor(() => expect(toggle().disabled).toBe(false));

    await user.click(toggle());
    await confirmInDialog('동의하기');

    await waitFor(() => expect(toast).toHaveBeenCalledWith(FAILED));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(toggle().checked).toBe(false);
  });
});
