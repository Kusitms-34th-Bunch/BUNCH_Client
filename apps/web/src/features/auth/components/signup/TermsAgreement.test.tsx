import { useQuery } from '@tanstack/react-query';
import { act, render as renderUi, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { SIGNUP_PATHS } from '../../constants/paths';
import { TermsAgreementProvider } from '../../contexts/TermsAgreementProvider';
import { sessionQueryOptions } from '../../queries/session';
import { TermsAgreement } from './TermsAgreement';
import { TermsDocument } from './TermsDocument';

const push = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back }) }));
const permissions = vi.hoisted(() => ({
  isRequesting: false,
  requestAll: vi.fn<() => Promise<void>>(),
}));
vi.mock('../../hooks/usePermissionRequests', () => ({ usePermissionRequests: () => permissions }));
const logout = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock('../../api/logout', () => ({ logout }));
const reloadTo = vi.hoisted(() => vi.fn<(_path: string) => void>());
vi.mock('../../lib/reloadTo', () => ({ reloadTo }));

const all = () => screen.getByRole('checkbox', { name: '전체 동의하기' });
const service = () => screen.getByRole('checkbox', { name: '[필수] 서비스 이용 약관' });
const privacy = () => screen.getByRole('checkbox', { name: '[필수] 개인정보 수집 및 이용 동의' });
const age = () => screen.getByRole('checkbox', { name: '[필수] 만 14세 이상입니다' });
const demographics = () =>
  screen.getByRole('checkbox', { name: '[선택] 추가 개인정보 수집 및 이용 동의' });
const start = () => screen.getByRole('button', { name: '시작하기' });
const isChecked = (checkbox: HTMLElement) => (checkbox as HTMLInputElement).checked;

// 약관·권한 요청이 Query(mutation)를 쓰므로 Provider 안에서 그림
const render = (ui: ReactElement) => renderUi(ui, { wrapper: createQueryWrapper() });
const renderPage = (initial?: Parameters<typeof TermsAgreementProvider>[0]['initial']) =>
  render(
    <TermsAgreementProvider {...(initial ? { initial } : {})}>
      <TermsAgreement />
    </TermsAgreementProvider>,
  );

// 약관 동의 저장 요청 본문을 가로채 확인(응답은 mock 서버 기본값)
const captureAgreements = (failure = false) => {
  const bodies: unknown[] = [];
  server.use(
    http.post('/api/auth/terms/agreements', async ({ request }) => {
      bodies.push(await request.json());
      return failure ? fail(500, 'SERVER_ERROR') : ok(null);
    }),
  );
  return bodies;
};

const REQUIRED = { service: true, privacy: true, age: true };

describe('TermsAgreement', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    reloadTo.mockClear();
    logout.mockReset();
    logout.mockResolvedValue();
    permissions.isRequesting = false;
    permissions.requestAll.mockReset();
    permissions.requestAll.mockResolvedValue();
  });

  it('화면 제목(h1)과 본문 영역(main), 헤더의 뒤로 가기 버튼을 가진다', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: '시작하기 전에 확인해 주세요!' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    ).toBeTruthy();
  });

  it('뒤로 가기는 로그아웃하고 로그인 화면을 새로 연다(가입 진행 상태는 서버에 남는다)', async () => {
    renderPage();

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    );

    await waitFor(() => expect(reloadTo).toHaveBeenCalledWith('/login'));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it('로그아웃에 실패하면 화면에 머문다', async () => {
    logout.mockRejectedValue(new Error('로그아웃 실패'));
    renderPage();

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    );

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(reloadTo).not.toHaveBeenCalled();
  });

  it('처음에는 아무것도 체크되어 있지 않고 시작하기 버튼이 비활성화되어 있다', () => {
    renderPage();

    for (const checkbox of [all(), service(), privacy(), age(), demographics()]) {
      expect(isChecked(checkbox)).toBe(false);
    }
    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('전체 동의하기를 누르면 선택 약관까지 모두 체크되고 시작하기 버튼이 활성화된다', async () => {
    renderPage();

    await userEvent.click(all());

    for (const checkbox of [all(), service(), privacy(), age(), demographics()]) {
      expect(isChecked(checkbox)).toBe(true);
    }
    expect(start().hasAttribute('disabled')).toBe(false);
  });

  it('모두 체크된 상태에서 전체 동의하기를 누르면 모두 해제된다', async () => {
    renderPage({ ...REQUIRED, demographics: true });

    await userEvent.click(all());

    for (const checkbox of [all(), service(), privacy(), age(), demographics()]) {
      expect(isChecked(checkbox)).toBe(false);
    }
    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('필수 3개만 체크해도 시작하기가 활성화되고, 전체 동의하기는 해제 상태다', async () => {
    renderPage();

    await userEvent.click(service());
    await userEvent.click(privacy());
    expect(start().hasAttribute('disabled')).toBe(true);
    await userEvent.click(age());

    expect(start().hasAttribute('disabled')).toBe(false);
    expect(isChecked(all())).toBe(false);
    expect(isChecked(demographics())).toBe(false);
  });

  it('선택 약관만 체크하면 시작하기는 비활성화된 채로 있다', async () => {
    renderPage();

    await userEvent.click(demographics());

    expect(isChecked(demographics())).toBe(true);
    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('개별 항목을 모두 체크하면 전체 동의하기도 체크되고, 하나를 풀면 풀린다', async () => {
    renderPage();

    for (const checkbox of [service, privacy, age, demographics]) {
      await userEvent.click(checkbox());
    }
    expect(isChecked(all())).toBe(true);

    await userEvent.click(demographics());
    expect(isChecked(all())).toBe(false);
    expect(start().hasAttribute('disabled')).toBe(false);
  });

  it('시작하기를 누르면 필수 약관 3종을 현재 버전으로 저장한 뒤 권한 요청을 마치고 프로필로 이동한다', async () => {
    const bodies = captureAgreements();
    let finish!: () => void;
    permissions.requestAll.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    renderPage(REQUIRED);

    await userEvent.click(start());

    await waitFor(() => expect(permissions.requestAll).toHaveBeenCalledTimes(1));
    expect(bodies).toEqual([
      {
        agreements: [
          { type: 'SERVICE', version: 'mock-service-1', agreed: true },
          { type: 'PRIVACY', version: 'mock-privacy-1', agreed: true },
          { type: 'AGE_OVER_14', version: 'mock-age-1', agreed: true },
        ],
      },
    ]);
    expect(push).not.toHaveBeenCalled();

    act(() => finish());
    await waitFor(() => expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.profile));
  });

  it('선택 약관에 동의했으면 4종을 함께 저장한다', async () => {
    const bodies = captureAgreements();
    renderPage({ ...REQUIRED, demographics: true });

    await userEvent.click(start());

    await waitFor(() => expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.profile));
    expect(bodies).toEqual([
      {
        agreements: [
          { type: 'SERVICE', version: 'mock-service-1', agreed: true },
          { type: 'PRIVACY', version: 'mock-privacy-1', agreed: true },
          { type: 'AGE_OVER_14', version: 'mock-age-1', agreed: true },
          { type: 'DEMOGRAPHICS', version: 'mock-demographics-1', agreed: true },
        ],
      },
    ]);
  });

  it('저장에 실패하면 권한 요청도 이동도 하지 않고 체크 상태를 둔 채 다시 누를 수 있다', async () => {
    captureAgreements(true);
    renderPage({ ...REQUIRED, demographics: true });

    await userEvent.click(start());

    await waitFor(() => expect(start().getAttribute('aria-busy')).toBeNull());
    expect(permissions.requestAll).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(isChecked(service())).toBe(true);
    expect(isChecked(demographics())).toBe(true);
    expect(start().hasAttribute('disabled')).toBe(false);
  });

  it('동의를 저장하는 동안에는 페이지 전체 로딩으로 화면을 덮고, 끝나면 걷는다', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post('/api/auth/terms/agreements', async () => {
        await gate;
        return ok(null);
      }),
    );
    renderPage(REQUIRED);

    await userEvent.click(start());

    await waitFor(() => expect(document.querySelector('.bg-overlay-dim-subtle')).not.toBeNull());
    expect(screen.getByRole('status').textContent).toBe('약관 동의를 저장하는 중이에요');
    release();
    await waitFor(() => expect(document.querySelector('.bg-overlay-dim-subtle')).toBeNull());
  });

  it('권한을 요청하는 동안에는 처리 중으로 표시하고 다시 눌러도 실행하지 않는다', async () => {
    const bodies = captureAgreements();
    permissions.isRequesting = true;
    renderPage(REQUIRED);

    // disabled가 아니라 aria-busy라 포커스를 잃지 않음
    expect(start().getAttribute('aria-busy')).toBe('true');
    expect(start().hasAttribute('disabled')).toBe(false);
    await userEvent.click(start());

    expect(bodies).toEqual([]);
    expect(permissions.requestAll).not.toHaveBeenCalled();
  });

  it('가입 상태를 다시 읽지 못하면(저장은 됐어도) 권한 요청도 이동도 하지 않는다', async () => {
    captureAgreements();
    // 가드(AuthGate)처럼 세션 query를 구독해야 저장 뒤 다시 읽기가 일어남. 처음 한 번만 성공
    let reads = 0;
    server.use(
      http.get('/api/members/me/onboarding', () => {
        reads += 1;
        return reads === 1
          ? ok({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: false })
          : fail(500, 'SERVER_ERROR');
      }),
    );
    function SessionObserver() {
      useQuery(sessionQueryOptions());
      return null;
    }
    render(
      <TermsAgreementProvider initial={REQUIRED}>
        <SessionObserver />
        <TermsAgreement />
      </TermsAgreementProvider>,
    );
    await waitFor(() => expect(reads).toBe(1));

    await userEvent.click(start());

    await waitFor(() => expect(reads).toBeGreaterThan(1));
    await waitFor(() => expect(start().getAttribute('aria-busy')).toBeNull());
    expect(permissions.requestAll).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('저장하는 동안에는 뒤로 가기(로그아웃)를 무시한다', async () => {
    let release!: () => void;
    server.use(
      http.post('/api/auth/terms/agreements', async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return ok(null);
      }),
    );
    renderPage(REQUIRED);

    await userEvent.click(start());
    await waitFor(() => expect(start().getAttribute('aria-busy')).toBe('true'));
    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    );

    expect(logout).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.profile));
  });

  it('약관 항목은 하나의 그룹으로 묶여 이름을 가진다', () => {
    renderPage();

    const group = screen.getByRole('group', { name: '약관 동의 항목' });
    expect(within(group).getAllByRole('checkbox')).toHaveLength(4);
  });

  it('원문이 있는 약관만 내용 보기 버튼이 있고 누르면 그 원문 화면으로 이동한다', async () => {
    renderPage();

    expect(screen.getAllByRole('button', { name: /내용 보기/ })).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: '서비스 이용 약관 내용 보기' }));
    expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.termsDocument('service'));

    await userEvent.click(
      screen.getByRole('button', { name: '개인정보 수집 및 이용 동의 내용 보기' }),
    );
    expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.termsDocument('privacy'));

    await userEvent.click(
      screen.getByRole('button', { name: '추가 개인정보 수집 및 이용 동의 내용 보기' }),
    );
    expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.termsDocument('demographics'));
  });

  it('앱 접근 권한 안내를 눌러서 바꿀 수 없는 정보로 보여 준다', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 2, name: '앱 접근 권한 안내' })).toBeTruthy();
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    for (const [name, description] of [
      ['사진 접근', '앨범에서 사진을 불러올 때 사용해요.'],
      ['카메라', '사진을 바로 찍어 올릴 때 사용해요.'],
      ['알림', '번치 소식과 코멘트 요청을 받아요.'],
    ] as const) {
      expect(within(list).getByText(name)).toBeTruthy();
      expect(within(list).getByText(description)).toBeTruthy();
    }
    expect(within(list).queryByRole('button')).toBeNull();
  });

  it('약관 원문 화면을 다녀와도 체크 상태가 유지된다', async () => {
    function Flow() {
      const [showDocument, setShowDocument] = useState(false);
      return (
        <TermsAgreementProvider>
          <button type="button" onClick={() => setShowDocument((value) => !value)}>
            전환
          </button>
          {showDocument ? <TermsDocument documentId="service" /> : <TermsAgreement />}
        </TermsAgreementProvider>
      );
    }
    render(<Flow />);

    await userEvent.click(service());
    await userEvent.click(demographics());
    await userEvent.click(screen.getByRole('button', { name: '전환' }));
    expect(screen.getByRole('heading', { level: 1, name: '서비스 이용약관' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '전환' }));

    expect(isChecked(service())).toBe(true);
    expect(isChecked(demographics())).toBe(true);
    expect(isChecked(privacy())).toBe(false);
  });
});
