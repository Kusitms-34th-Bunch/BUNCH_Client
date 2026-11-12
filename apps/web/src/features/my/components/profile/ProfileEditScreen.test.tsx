import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/shared/query/testing';
import { ProfileEditScreen } from './ProfileEditScreen';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

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

// 닉네임 중복 확인은 기본으로 사용 가능(true)이라 응답 뒤 수정하기가 켜짐
const renderScreen = (checkNickname = vi.fn((_nickname: string) => Promise.resolve(true))) => {
  render(
    <ProfileEditScreen
      profile={{ nickname: '으누', birthYear: 2003, gender: 'male' }}
      checkNickname={checkNickname}
    />,
    { wrapper: createQueryWrapper() },
  );
  return checkNickname;
};
const submitButton = () =>
  screen.getByRole<HTMLButtonElement>('button', { name: '프로필 수정하기' });
const waitForEnabled = () => waitFor(() => expect(submitButton().disabled).toBe(false));
const nicknameInput = () => screen.getByRole<HTMLInputElement>('textbox', { name: /닉네임/ });

describe('ProfileEditScreen', () => {
  it('지금 값을 채워 보여 주고, 바뀐 값이 없으면 수정하기가 비활성이다', () => {
    renderScreen();

    expect(nicknameInput().value).toBe('으누');
    // 출생연도·성별은 편집 화면에 없음(Figma 개인 프로필 편집)
    expect(screen.queryByRole('textbox', { name: /출생연도/ })).toBeNull();
    expect(screen.queryByRole('group', { name: '성별' })).toBeNull();
    expect(submitButton().disabled).toBe(true);
  });

  it('값을 바꾸면 활성, 원래 값으로 되돌리면(앞뒤 공백 포함) 다시 비활성이다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();

    await user.clear(nicknameInput());
    await user.type(nicknameInput(), '으누 ');
    expect(submitButton().disabled).toBe(true);
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

  it('수정하기를 누르면 MY로 돌아가 토스트를 띄우고, 다시 누를 수 없다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());

    expect(replace).toHaveBeenCalledWith('/my');
    expect(toastAfterNavigation).toHaveBeenCalledWith('프로필을 수정했어요.');
    expect(submitButton().disabled).toBe(true);
  });

  it('MY에서 들어왔으면 저장 뒤 그 기록으로 돌아간다(MY 기록을 쌓지 않음)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
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

  it('바꾼 내용이 있으면 뒤로 가기 전에 확인하고, 「취소」는 입력을 두고 「나가기」는 MY로 간다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(nicknameInput(), '짱');

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    const dialog = await screen.findByRole('alertdialog', { name: '저장하지 않고 나갈까요?' });
    expect(within(dialog).getByText('변경한 내용이 반영되지 않아요.')).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(replace).not.toHaveBeenCalled();
    expect(nicknameInput().value).toBe('으누짱');

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '나가기' }),
    );
    expect(replace).toHaveBeenCalledWith('/my');
  });

  it('MY에서 들어왔으면 「나가기」 뒤 그 기록으로 돌아간다(MY 기록을 쌓지 않음)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    renderScreen();
    await user.type(nicknameInput(), '짱');

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: '나가기' }),
    );

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('저장한 뒤에는 뒤로 가기에 나가기 확인을 띄우지 않는다', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(nicknameInput(), '짱');
    await waitForEnabled();
    await user.click(submitButton());

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('닉네임을 바꾸고 0.5초 뒤 중복을 확인한다', async () => {
    const user = userEvent.setup();
    const check = renderScreen();

    await user.type(nicknameInput(), '짱');
    expect(check).not.toHaveBeenCalled();

    await waitFor(() => expect(check).toHaveBeenCalledWith('으누짱'));
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('이미 사용 중인 닉네임이면 오류를 보이고 수정하기를 막는다', async () => {
    const user = userEvent.setup();
    renderScreen(vi.fn((_nickname: string) => Promise.resolve(false)));

    await user.type(nicknameInput(), '짱');

    expect((await screen.findByRole('alert')).textContent).toContain(
      '이미 사용 중인 닉네임이에요.',
    );
    expect(submitButton().disabled).toBe(true);
  });

  it('지금 내 닉네임과 같은 값은 중복 확인을 하지 않는다', async () => {
    const user = userEvent.setup();
    const check = renderScreen();

    await user.type(nicknameInput(), ' ');
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(check).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('허용하지 않는 문자가 섞인 글을 붙여넣으면 그 문자만 빼고 넣는다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(nicknameInput());
    await user.paste('a!b@\n😀c');

    expect(nicknameInput().value).toBe('으누abc');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('제목과 사진 변경 버튼의 이름을 가진다', () => {
    renderScreen();

    expect(screen.getByRole('heading', { level: 1, name: '개인 프로필 수정' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '프로필 사진 변경' })).toBeTruthy();
  });
});
