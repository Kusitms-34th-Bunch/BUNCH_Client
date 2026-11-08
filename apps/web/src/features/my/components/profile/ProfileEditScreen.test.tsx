import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/shared/query/testing';
import { ProfileEditScreen } from './ProfileEditScreen';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

const renderScreen = () =>
  render(<ProfileEditScreen profile={{ nickname: '으누', birthYear: 2003, gender: 'male' }} />, {
    wrapper: createQueryWrapper(),
  });
const submitButton = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: '프로필 수정하기' });
const nicknameInput = () => screen.getByRole<HTMLInputElement>('textbox', { name: /닉네임/ });

describe('ProfileEditScreen', () => {
  it('지금 값을 채워 보여 주고, 바뀐 값이 없으면 수정하기가 비활성이다', () => {
    renderScreen();

    expect(nicknameInput().value).toBe('으누');
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /출생연도/ }).value).toBe('2003');
    const gender = screen.getByRole('group', { name: '성별' });
    expect(within(gender).getByRole('button', { name: '남성' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByText('선택')).toBeNull();
    expect(submitButton().disabled).toBe(true);
  });

  it('값을 바꾸면 활성, 원래 값으로 되돌리면(앞뒤 공백 포함) 다시 비활성이다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    expect(submitButton().disabled).toBe(false);

    await user.clear(nicknameInput());
    await user.type(nicknameInput(), '으누 ');
    expect(submitButton().disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: '여성' }));
    expect(submitButton().disabled).toBe(false);
  });

  it('닉네임에 허용하지 않는 문자가 있으면 오류를 보이고 수정하기를 막는다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '!');

    expect(screen.getByRole('alert').textContent).toContain(
      '특수문자를 제외한 영문, 한글만 사용할 수 있어요.',
    );
    expect(submitButton().disabled).toBe(true);
  });

  it('출생연도가 범위 밖이면 수정하기를 막는다', async () => {
    const user = userEvent.setup();
    renderScreen();
    const birthYear = screen.getByRole('textbox', { name: /출생연도/ });

    await user.clear(birthYear);
    await user.type(birthYear, '1900');

    expect(submitButton().disabled).toBe(true);
  });

  it('수정하기를 누르면 MY로 돌아가 토스트를 띄우고, 다시 누를 수 없다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '여성' }));
    await user.click(submitButton());

    expect(replace).toHaveBeenCalledWith('/my');
    expect(toast).toHaveBeenCalledWith('프로필을 수정했어요.');
    expect(submitButton().disabled).toBe(true);
  });

  it('MY에서 들어왔으면 저장 뒤 그 기록으로 돌아간다(MY 기록을 쌓지 않음)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    renderScreen();

    await user.click(screen.getByRole('button', { name: '여성' }));
    await user.click(submitButton());

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('돌아갈 기록이 없으면 뒤로 가기가 MY로 바꾼다(직접 진입)', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/my');
  });

  it('제목과 사진 변경 버튼의 이름을 가진다', () => {
    renderScreen();

    expect(screen.getByRole('heading', { level: 1, name: '개인 프로필 수정' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '프로필 사진 변경' })).toBeTruthy();
  });
});
