import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../../contexts/CreateBunchDraftProvider';
import { BunchBasicInfo } from './BunchBasicInfo';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
const Providers = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider>
    <>{children}</>
  </CreateBunchDraftProvider>
);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));

// 기본은 중복 확인 없이(확인 중에는 다음이 잠겨 다른 동작 검증이 흔들림), 중복 확인은 아래 별도 묶음에서 확인
const renderStep = () => render(<BunchBasicInfo checkName={null} />, { wrapper: Providers });

const nameInput = () => screen.getByRole('textbox', { name: '번치 이름' });
const nextButton = () => screen.getByRole('button', { name: '다음' });
const ERROR_TEXT = '특수문자를 제외한 영문, 한글만 사용할 수 있어요.';

describe('BunchBasicInfo', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
  });

  it('화면 제목을 보여 준다', () => {
    renderStep();

    expect(screen.getByRole('heading', { level: 1, name: '어떤 번치를 만들까요?' })).toBeTruthy();
  });

  it('처음에는 다음 버튼이 비활성이고 글자 수는 0/12다', () => {
    renderStep();

    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('0/12')).toBeTruthy();
  });

  it('이름을 입력하면 글자 수가 바뀐다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '퇴근런클럽');

    expect(screen.getByText('5/12')).toBeTruthy();
  });

  it('12자를 넘겨서는 입력되지 않는다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '가나다라마바사아자차카타파하');

    expect(screen.getByDisplayValue('가나다라마바사아자차카타')).toBe(nameInput());
    expect(screen.getByText('12/12')).toBeTruthy();
  });

  it('이름만 입력하고 공개 범위를 고르지 않으면 다음은 비활성이다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '퇴근런클럽');

    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('공개 범위만 고르고 이름이 없으면 다음은 비활성이다', async () => {
    renderStep();

    await userEvent.click(screen.getByRole('radio', { name: /^공개 번치/ }));

    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('이름과 공개 범위를 모두 정하면 다음이 활성화되고 누르면 다음 단계로 이동한다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '퇴근런클럽');
    await userEvent.click(screen.getByRole('radio', { name: /비공개 번치/ }));
    expect((nextButton() as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(nextButton());

    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchDescription);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('숫자는 이름에 쓸 수 있다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '러닝크루2');
    await userEvent.click(screen.getByRole('radio', { name: /^공개 번치/ }));

    expect(nameInput().getAttribute('aria-invalid')).toBeNull();
    expect((nextButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('특수문자를 입력하면 오류 안내를 보여 주고 다음은 비활성이다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '퇴근런클@');
    await userEvent.click(screen.getByRole('radio', { name: /^공개 번치/ }));

    expect(screen.getByRole('alert').textContent).toBe(ERROR_TEXT);
    expect(nameInput().getAttribute('aria-invalid')).toBe('true');
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('오류를 고치면 안내가 사라진다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '퇴근런클@');
    await userEvent.type(nameInput(), '{Backspace}');

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('공개 범위는 하나만 선택되고 「공개 범위」 그룹 이름을 가진다', async () => {
    renderStep();
    expect(screen.getByRole('group', { name: '공개 범위' })).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: /비공개 번치/ }));
    await userEvent.click(screen.getByRole('radio', { name: /^공개 번치/ }));

    expect(screen.getByRole('radio', { name: /^공개 번치/ })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: /비공개 번치/ })).toHaveProperty('checked', false);
  });

  it('공백은 이름에 쓸 수 없다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '러닝 크루');

    expect(screen.getByRole('alert').textContent).toBe(ERROR_TEXT);
  });

  it('한글 조합 중 자모는 오류로 보지 않고 조합이 끝났는데 자모만 남으면 오류로 본다', () => {
    renderStep();

    fireEvent.compositionStart(nameInput());
    fireEvent.change(nameInput(), { target: { value: '퇴근런클ㅎ' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(nameInput().getAttribute('aria-invalid')).toBeNull();

    fireEvent.compositionEnd(nameInput());
    expect(screen.getByRole('alert').textContent).toBe(ERROR_TEXT);

    fireEvent.compositionStart(nameInput());
    fireEvent.change(nameInput(), { target: { value: '퇴근런클러' } });
    fireEvent.compositionEnd(nameInput());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('BunchBasicInfo 번치 이름 중복 확인', () => {
  const renderChecked = (check: (_name: string) => Promise<boolean>) =>
    render(<BunchBasicInfo checkName={check} />, { wrapper: Providers });
  const pickVisibility = () => userEvent.click(screen.getByRole('radio', { name: /^공개 번치/ }));

  it('입력을 멈추고 0.5초 뒤 앞뒤 공백을 지운 이름으로 확인하고 확인 중에는 다음이 잠긴다', async () => {
    const check = vi.fn().mockResolvedValue(true);
    renderChecked(check);

    await userEvent.type(nameInput(), '퇴근런클럽');
    await pickVisibility();
    expect(check).not.toHaveBeenCalled();
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);

    await waitFor(() => expect(check).toHaveBeenCalledWith('퇴근런클럽'), { timeout: 2000 });
    await waitFor(() => expect((nextButton() as HTMLButtonElement).disabled).toBe(false));
    expect(check).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('확인하는 동안 입력란 아래에 확인 중 안내를 보이고, 문제가 없으면 안내가 사라진다', async () => {
    renderChecked(vi.fn().mockResolvedValue(true));
    const CHECKING = '사용 가능한 이름인지 확인 중이에요.';

    await userEvent.type(nameInput(), '퇴근런클럽');

    expect(screen.getByText(CHECKING, { selector: 'p[aria-hidden="true"]' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    await waitFor(
      () => expect(screen.queryByText(CHECKING, { selector: 'p[aria-hidden="true"]' })).toBeNull(),
      {
        timeout: 2000,
      },
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('이미 사용 중이면 확인 중 안내가 사라지고 오류 문구가 보인다', async () => {
    renderChecked(vi.fn().mockResolvedValue(false));

    await userEvent.type(nameInput(), '퇴근런클럽');

    await waitFor(
      () => expect(screen.getByRole('alert').textContent).toBe('이미 사용 중인 번치 이름이에요'),
      { timeout: 2000 },
    );
    expect(
      screen.queryByText('사용 가능한 이름인지 확인 중이에요.', {
        selector: 'p[aria-hidden="true"]',
      }),
    ).toBeNull();
  });

  it('이미 사용 중인 이름이면 입력란 아래에 안내하고 다음은 비활성이다', async () => {
    renderChecked(vi.fn().mockResolvedValue(false));

    await userEvent.type(nameInput(), '퇴근런클럽');
    await pickVisibility();

    await waitFor(
      () => expect(screen.getByRole('alert').textContent).toBe('이미 사용 중인 번치 이름이에요'),
      { timeout: 2000 },
    );
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('확인 요청이 실패하면 문구 없이 다음을 열어 둔다(생성 때 서버가 최종 판단)', async () => {
    const check = vi.fn().mockRejectedValue(new Error('network'));
    renderChecked(check);

    await userEvent.type(nameInput(), '퇴근런클럽');
    await pickVisibility();

    await waitFor(() => expect(check).toHaveBeenCalled(), { timeout: 2000 });
    await waitFor(() => expect((nextButton() as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('규칙에 맞지 않는 이름은 서버에 묻지 않는다', async () => {
    const check = vi.fn().mockResolvedValue(true);
    renderChecked(check);

    await userEvent.type(nameInput(), '퇴근런클@');
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(check).not.toHaveBeenCalled();
  });

  it('생성 때 이미 쓰는 이름이라고 거절된 이름은 확인 결과와 무관하게 사용 중으로 안내한다', async () => {
    const TakenProbe = () => {
      const { markNameTaken } = useCreateBunchDraft();
      return <button onClick={() => markNameTaken('퇴근런클럽')}>거절 기록</button>;
    };
    render(
      <>
        <BunchBasicInfo checkName={null} />
        <TakenProbe />
      </>,
      { wrapper: Providers },
    );

    await userEvent.type(nameInput(), '퇴근런클럽');
    await pickVisibility();
    expect((nextButton() as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: '거절 기록' }));

    expect(screen.getByRole('alert').textContent).toBe('이미 사용 중인 번치 이름이에요');
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('거절된 이름도 서버 확인이 사용 가능으로 돌아오면 다시 쓸 수 있다', async () => {
    const TakenProbe = () => {
      const { markNameTaken } = useCreateBunchDraft();
      return <button onClick={() => markNameTaken('퇴근런클럽')}>거절 기록</button>;
    };
    render(
      <>
        <BunchBasicInfo checkName={vi.fn().mockResolvedValue(true)} />
        <TakenProbe />
      </>,
      { wrapper: Providers },
    );

    await userEvent.type(nameInput(), '퇴근런클럽');
    await pickVisibility();
    await userEvent.click(screen.getByRole('button', { name: '거절 기록' }));

    await waitFor(() => expect((nextButton() as HTMLButtonElement).disabled).toBe(false), {
      timeout: 2000,
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
