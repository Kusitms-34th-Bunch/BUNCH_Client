import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { BunchMemberInvite } from './BunchMemberInvite';

const back = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back }) }));

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
});

const linkField = () => screen.getByRole<HTMLInputElement>('textbox');

describe('BunchMemberInvite', () => {
  it('지금 번치(내 기본 번치)의 실제 초대 링크를 보여 준다', async () => {
    render(<BunchMemberInvite leaveHref="/bunch/members" />, { wrapper: createQueryWrapper() });

    // 가짜 서버는 번치 ID로 만든 링크를 돌려줌(Figma 예시 값이 아님)
    await waitFor(() =>
      expect(linkField().value).toBe(
        `https://bunch.app/invite/MOCK${String(MOCK_BUNCH_ID).padStart(4, '0')}`,
      ),
    );
  });

  it('링크를 받지 못하면 다시 불러오기로 다시 받는다', async () => {
    let attempts = 0;
    server.use(
      http.post('/api/bunches/:id/invitations', () => {
        attempts += 1;
        return attempts === 1 ? fail(500, 'COMMON_500') : undefined;
      }),
    );
    render(<BunchMemberInvite leaveHref="/bunch/members" />, { wrapper: createQueryWrapper() });

    const retry = await screen.findByRole('button', { name: '다시 불러오기' });
    await userEvent.click(retry);

    await waitFor(() => expect(linkField().value).toMatch(/^https:\/\/bunch\.app\/invite\/MOCK/));
    expect(attempts).toBe(2);
  });

  it('다시 불러오는 동안 받는 중으로 알린다', async () => {
    let release: () => void = () => undefined;
    let attempts = 0;
    server.use(
      http.post('/api/bunches/:id/invitations', async () => {
        attempts += 1;
        if (attempts === 1) return fail(500, 'COMMON_500');
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return ok({
          url: 'https://bunch.app/invite/MOCKHELD',
          code: 'MOCKHELD',
          expiresAt: '2026-12-01T00:00:00.000Z',
        });
      }),
    );
    render(<BunchMemberInvite leaveHref="/bunch/members" />, { wrapper: createQueryWrapper() });

    await userEvent.click(await screen.findByRole('button', { name: '다시 불러오기' }));

    // 받는 동안 덮개가 화면을 가려 접근성 트리 밖이라 hidden까지 찾음
    await waitFor(() =>
      expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
        '초대 링크를 불러오는 중이에요',
      ),
    );
    expect(screen.getByRole('button', { name: '다시 불러오기', hidden: true })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    // 핸들러가 두 번째 요청에 들어와 release를 잡은 뒤 풀어 줌(같은 틱에 할당)
    await waitFor(() => expect(attempts).toBe(2));
    release();
    await waitFor(() => expect(linkField().value).toMatch(/^https:\/\/bunch\.app\/invite\/MOCK/));
  });

  it('소속 번치가 없으면 계속 받는 중으로 두지 않고 다시 불러오기를 보인다', async () => {
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter((m) => m.memberId !== MOCK_MY_MEMBER_ID),
    }));
    render(<BunchMemberInvite leaveHref="/bunch/members" />, { wrapper: createQueryWrapper() });

    expect(await screen.findByRole('button', { name: '다시 불러오기' })).toBeTruthy();
    expect(screen.getByRole('status')).not.toHaveTextContent('불러오는 중');
  });

  it('닫으면 이전 화면으로 돌아간다(멤버 관리·더보기 메뉴에서 들어옴)', async () => {
    render(<BunchMemberInvite leaveHref="/bunch/members" />, { wrapper: createQueryWrapper() });

    await userEvent.click(screen.getByRole('button', { name: /닫기/ }));

    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
  });
});
