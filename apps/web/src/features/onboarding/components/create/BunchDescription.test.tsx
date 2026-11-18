import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../../contexts/CreateBunchDraftProvider';
import { BunchBasicInfo } from './BunchBasicInfo';
import { BunchDescription } from './BunchDescription';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
const Providers = ({ children }: { children: ReactNode }) => {
  // 다시 그려도 같은 wrapper를 써서 입력 상태가 유지되게 함
  const [QueryWrapper] = useState(() => createQueryWrapper());
  return (
    <QueryWrapper>
      <CreateBunchDraftProvider>
        <>{children}</>
      </CreateBunchDraftProvider>
    </QueryWrapper>
  );
};
// 2단계 가드 통과를 위한 1단계 완료 상태
const AfterBasicInfo = ({ children }: { children: ReactNode }) => {
  // 다시 그려도 같은 wrapper를 써서 입력 상태가 유지되게 함
  const [QueryWrapper] = useState(() => createQueryWrapper());
  return (
    <QueryWrapper>
      <CreateBunchDraftProvider initial={{ name: '퇴근런클럽', visibility: 'public' }}>
        <>{children}</>
      </CreateBunchDraftProvider>
    </QueryWrapper>
  );
};
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));
// 토스트 표시는 DS의 `toast()` 담당이라 호출만 차단
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

const renderStep = () => render(<BunchDescription />, { wrapper: AfterBasicInfo });
const input = () => screen.getByRole('textbox', { name: '한 줄 소개' });
const nextButton = () => screen.getByRole('button', { name: '다음' });

describe('BunchDescription', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
    vi.mocked(toast).mockClear();
  });

  it('화면 제목을 보여 준다', () => {
    renderStep();

    expect(screen.getByRole('heading', { level: 1, name: '번치를 소개해주세요' })).toBeTruthy();
  });

  it('처음에는 다음이 비활성이고 글자 수는 0/50이다', () => {
    renderStep();

    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('0/50')).toBeTruthy();
  });

  it('소개를 입력하면 글자 수가 바뀌고 다음이 활성화되며 누르면 3단계로 이동한다', async () => {
    renderStep();

    await userEvent.type(input(), '맛집 탐방에 진심인 사람들');
    expect(screen.getByText('14/50')).toBeTruthy();
    expect((nextButton() as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(nextButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchMood));
  });

  it('다음을 누르면 서버가 소개를 검사하고, 금칙어면 넘어가지 않고 입력란 아래에 안내한다', async () => {
    let received: unknown;
    server.use(
      http.post('/api/bunches/introduction-validation', async ({ request }) => {
        received = await request.json();
        return fail(400, 'COMMON_003', { fields: ['introduction'] });
      }),
    );
    renderStep();

    await userEvent.type(input(), '나쁜 말 소개');
    await userEvent.click(nextButton());

    // 안내 문구는 화면 표시와 스크린 리더 알림 두 곳에 들어감
    expect(await screen.findAllByText('사용할 수 없는 단어가 포함되어 있어요')).not.toHaveLength(0);
    expect(received).toEqual({ introduction: '나쁜 말 소개' });
    expect(push).not.toHaveBeenCalled();
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input());
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);

    // 고치면 안내를 지우고 다시 누를 수 있음
    await userEvent.type(input(), '!');
    expect(screen.queryAllByText('사용할 수 없는 단어가 포함되어 있어요')).toHaveLength(0);
    expect((nextButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('검사를 보낸 뒤 소개를 고치면 그 응답으로는 넘어가지 않는다', async () => {
    let respond!: () => void;
    server.use(
      http.post(
        '/api/bunches/introduction-validation',
        () => new Promise<Response>((resolve) => (respond = () => resolve(ok(null)))),
      ),
    );
    renderStep();
    await userEvent.type(input(), '맛집 탐방');
    await userEvent.click(nextButton());
    await waitFor(() => expect(respond).toBeDefined());

    // 검사 중에도 소개를 고칠 수 있음(다음만 잠김)
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(input(), ' 모임');
    respond();

    await waitFor(() => expect((nextButton() as HTMLButtonElement).disabled).toBe(false));
    expect(push).not.toHaveBeenCalled();
  });

  it('「다음」을 연달아 눌러도 검사는 한 번만 보낸다', async () => {
    let calls = 0;
    server.use(
      http.post('/api/bunches/introduction-validation', () => {
        calls += 1;
        return ok(null);
      }),
    );
    renderStep();
    await userEvent.type(input(), '맛집 탐방');

    fireEvent.click(nextButton());
    fireEvent.click(nextButton());

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
  });

  it('검사가 금칙어가 아닌 이유로 실패하면 넘어가지 않고 공통 오류 토스트를 띄운다', async () => {
    server.use(http.post('/api/bunches/introduction-validation', () => fail(503, 'COMMON_999')));
    renderStep();

    await userEvent.type(input(), '맛집 탐방');
    await userEvent.click(nextButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(push).not.toHaveBeenCalled();
    expect((nextButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('공백만 입력하면 다음은 비활성이다', async () => {
    renderStep();

    await userEvent.type(input(), '   ');

    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('50자를 넘겨서는 입력되지 않는다', async () => {
    renderStep();

    await userEvent.type(input(), '가'.repeat(60));

    expect(screen.getByText('50/50')).toBeTruthy();
  });

  it('Enter로 줄을 바꿀 수 없다', async () => {
    renderStep();

    await userEvent.type(input(), '맛집{Enter}탐방');

    expect(screen.getByDisplayValue('맛집탐방')).toBe(input());
  });

  it('한글 조합 중 확정 Enter는 막지 않는다', () => {
    renderStep();

    const composing = fireEvent.keyDown(input(), { key: 'Enter', isComposing: true });
    const plain = fireEvent.keyDown(input(), { key: 'Enter' });

    expect(composing).toBe(true);
    expect(plain).toBe(false);
  });

  it('이전은 이전 화면으로 돌아간다', async () => {
    renderStep();

    await userEvent.click(screen.getByRole('button', { name: '이전' }));

    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('입력과 관계없이 소개 예시 3개를 항상 보여 준다', () => {
    renderStep();

    expect(screen.getByRole('heading', { level: 2, name: '이런 소개는 어때요?' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('TIP')).toBeTruthy();
  });
});

describe('BunchDescription 직접 진입', () => {
  it('1단계를 마치지 않고 들어오면 화면을 그리지 않고 1단계로 되돌린다', () => {
    replace.mockClear();
    render(<BunchDescription />, { wrapper: Providers });

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch);
  });
});

describe('번치 만들기 단계 사이의 입력값', () => {
  it('2단계에 쓴 소개와 1단계에 쓴 이름이 같은 provider 안에서 유지된다', async () => {
    const Both = ({ step }: { step: 1 | 2 }) =>
      step === 1 ? <BunchBasicInfo /> : <BunchDescription />;
    const { rerender } = render(<Both step={1} />, { wrapper: Providers });
    await userEvent.type(screen.getByRole('textbox', { name: '번치 이름' }), '퇴근런클럽');
    await userEvent.click(screen.getByRole('radio', { name: /^공개 번치/ }));

    rerender(<Both step={2} />);
    await userEvent.type(input(), '맛집 탐방');
    rerender(<Both step={1} />);

    expect(screen.getByRole('textbox', { name: '번치 이름' })).toHaveProperty(
      'value',
      '퇴근런클럽',
    );
    rerender(<Both step={2} />);
    expect(input()).toHaveProperty('value', '맛집 탐방');
  });

  it('provider 밖에서는 쓸 수 없다', () => {
    const Probe = () => {
      useCreateBunchDraft();
      return null;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Probe />)).toThrow('CreateBunchDraftProvider');
    spy.mockRestore();
  });
});
