import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../constants/paths';
import { CreateBunchDraftProvider } from '../model/CreateBunchDraftProvider';
import { BunchBasicInfo } from './BunchBasicInfo';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
const Providers = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider>
    <OverlayProvider>{children}</OverlayProvider>
  </CreateBunchDraftProvider>
);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));

const renderStep = () => render(<BunchBasicInfo />, { wrapper: Providers });

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

    expect(screen.getByRole('status').textContent).toBe(ERROR_TEXT);
    expect(nameInput().getAttribute('aria-invalid')).toBe('true');
    expect((nextButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('오류를 고치면 안내가 사라진다', async () => {
    renderStep();

    await userEvent.type(nameInput(), '퇴근런클@');
    await userEvent.type(nameInput(), '{Backspace}');

    expect(screen.getByRole('status').textContent).toBe('');
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

    expect(screen.getByRole('status').textContent).toBe(ERROR_TEXT);
  });

  it('한글 조합 중 자모는 오류로 보지 않고 조합이 끝났는데 자모만 남으면 오류로 본다', () => {
    renderStep();

    fireEvent.compositionStart(nameInput());
    fireEvent.change(nameInput(), { target: { value: '퇴근런클ㅎ' } });
    expect(screen.getByRole('status').textContent).toBe('');
    expect(nameInput().getAttribute('aria-invalid')).toBeNull();

    fireEvent.compositionEnd(nameInput());
    expect(screen.getByRole('status').textContent).toBe(ERROR_TEXT);

    fireEvent.compositionStart(nameInput());
    fireEvent.change(nameInput(), { target: { value: '퇴근런클러' } });
    fireEvent.compositionEnd(nameInput());
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
