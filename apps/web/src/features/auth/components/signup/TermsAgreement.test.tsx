import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGNUP_PATHS } from '../../constants/paths';
import { TermsAgreementProvider } from '../../contexts/TermsAgreementProvider';
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

const all = () => screen.getByRole('checkbox', { name: '필수 항목 모두 체크하기' });
const service = () => screen.getByRole('checkbox', { name: '[필수] 서비스 이용 약관' });
const privacy = () => screen.getByRole('checkbox', { name: '[필수] 개인정보 수집 및 이용 동의' });
const age = () => screen.getByRole('checkbox', { name: '[필수] 만 14세 이상입니다' });
const start = () => screen.getByRole('button', { name: '시작하기' });

const renderPage = (initial?: Parameters<typeof TermsAgreementProvider>[0]['initial']) =>
  render(
    <TermsAgreementProvider {...(initial ? { initial } : {})}>
      <TermsAgreement />
    </TermsAgreementProvider>,
  );

describe('TermsAgreement', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    permissions.isRequesting = false;
    permissions.requestAll.mockReset();
    permissions.requestAll.mockResolvedValue();
  });

  it('화면 제목(h1)과 본문 영역(main), 헤더의 뒤로 가기 버튼을 가진다', async () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: '시작하기 전에 확인해 주세요!' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    );
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('처음에는 아무것도 체크되어 있지 않고 시작하기 버튼이 비활성화되어 있다', () => {
    renderPage();

    for (const checkbox of [all(), service(), privacy(), age()]) {
      expect((checkbox as HTMLInputElement).checked).toBe(false);
    }
    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('모두 체크하기를 누르면 모든 항목이 체크되고 시작하기 버튼이 활성화된다', async () => {
    renderPage();

    await userEvent.click(all());

    for (const checkbox of [all(), service(), privacy(), age()]) {
      expect((checkbox as HTMLInputElement).checked).toBe(true);
    }
    expect(start().hasAttribute('disabled')).toBe(false);
  });

  it('모두 체크된 상태에서 모두 체크하기를 누르면 모두 해제된다', async () => {
    renderPage({ service: true, privacy: true, age: true });

    await userEvent.click(all());

    for (const checkbox of [all(), service(), privacy(), age()]) {
      expect((checkbox as HTMLInputElement).checked).toBe(false);
    }
    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('일부만 체크하면 모두 체크하기는 해제 상태이고 시작하기 버튼은 비활성화된 채로 있다', async () => {
    renderPage();

    await userEvent.click(service());
    await userEvent.click(privacy());

    expect((service() as HTMLInputElement).checked).toBe(true);
    expect((all() as HTMLInputElement).checked).toBe(false);
    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('개별 항목을 모두 체크하면 모두 체크하기도 체크되고, 하나를 풀면 풀린다', async () => {
    renderPage();

    await userEvent.click(service());
    await userEvent.click(privacy());
    await userEvent.click(age());
    expect((all() as HTMLInputElement).checked).toBe(true);
    expect(start().hasAttribute('disabled')).toBe(false);

    await userEvent.click(privacy());
    expect((all() as HTMLInputElement).checked).toBe(false);
    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('모두 동의하고 시작하기를 누르면 권한 요청을 마친 뒤 프로필 화면으로 이동한다', async () => {
    let finish!: () => void;
    permissions.requestAll.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    renderPage();

    await userEvent.click(all());
    await userEvent.click(start());

    expect(permissions.requestAll).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();

    act(() => finish());
    await waitFor(() => expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.profile));
  });

  it('권한을 요청하는 동안에는 시작하기를 다시 누를 수 없다', () => {
    permissions.isRequesting = true;
    renderPage({ service: true, privacy: true, age: true });

    expect(start().hasAttribute('disabled')).toBe(true);
  });

  it('원문이 있는 약관만 내용 보기 버튼이 있고 누르면 그 원문 화면으로 이동한다', async () => {
    renderPage();

    expect(screen.getAllByRole('button', { name: /내용 보기/ })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: '서비스 이용 약관 내용 보기' }));
    expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.termsDocument('service'));

    await userEvent.click(
      screen.getByRole('button', { name: '개인정보 수집 및 이용 동의 내용 보기' }),
    );
    expect(push).toHaveBeenLastCalledWith(SIGNUP_PATHS.termsDocument('privacy'));
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
    await userEvent.click(screen.getByRole('button', { name: '전환' }));
    expect(screen.getByRole('heading', { level: 1, name: '서비스 이용약관' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '전환' }));

    expect((service() as HTMLInputElement).checked).toBe(true);
    expect((privacy() as HTMLInputElement).checked).toBe(false);
  });
});
