import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
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
const renderScreen = (
  checkNickname = vi.fn((_nickname: string) => Promise.resolve(true)),
  demographicsConsent = false,
) => {
  render(
    <ProfileEditScreen
      profile={{ nickname: '으누', birthYear: 2003, gender: 'male' }}
      demographicsConsent={demographicsConsent}
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
    expect(submitButton().disabled).toBe(true);
  });

  it('추가 개인정보에 동의하지 않았으면 출생연도·성별 칸과 비공개 안내가 보이지 않는다', () => {
    renderScreen();

    expect(screen.queryByRole('textbox', { name: /출생연도/ })).toBeNull();
    expect(screen.queryByRole('group', { name: '성별' })).toBeNull();
    expect(screen.queryByText('출생연도와 성별은 다른 사용자에게 공개되지 않아요.')).toBeNull();
    expect(submitButton().disabled).toBe(true);
  });

  it('동의했으면 저장된 출생연도·성별이 채워지고 고칠 수 있다(기능명세서 7.2.6)', async () => {
    const user = userEvent.setup();
    renderScreen(undefined, true);

    const birthYear = screen.getByRole<HTMLInputElement>('textbox', { name: /출생연도/ });
    expect(birthYear.disabled).toBe(false);
    expect(birthYear.value).toBe('2003');
    const gender = screen.getByRole('group', { name: '성별' });
    expect(within(gender).getByRole('button', { name: '남성' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(submitButton().disabled).toBe(true);

    // 바꾸면 변경 사항이 생겨 활성, 원래 값으로 되돌리면 다시 비활성
    await user.clear(birthYear);
    await user.type(birthYear, '1999');
    await waitForEnabled();
    await user.clear(birthYear);
    await user.type(birthYear, '2003');
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

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    expect(toastAfterNavigation).toHaveBeenCalledWith('프로필을 수정했어요.');
    expect(submitButton().disabled).toBe(true);
  });

  it('닉네임과 사진 처리(그대로)를 서버에 저장한다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    const me = mockDb.get().members.find((member) => member.memberId === MOCK_MY_MEMBER_ID);
    expect(me?.nickname).toBe('으누누');
  });

  it('동의했으면 출생연도·성별을 함께 저장하고, 지운 출생연도는 없음으로 저장한다', async () => {
    mockDb.update((state) => ({
      ...state,
      members: state.members.map((member) =>
        member.memberId === MOCK_MY_MEMBER_ID
          ? { ...member, additionalInfoConsented: true, birthYear: 2003, gender: 'MALE' }
          : member,
      ),
    }));
    const user = userEvent.setup();
    renderScreen(undefined, true);

    await user.clear(screen.getByRole('textbox', { name: /출생연도/ }));
    await user.click(screen.getByRole('button', { name: '여성' }));
    await waitForEnabled();
    await user.click(submitButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    const me = mockDb.get().members.find((member) => member.memberId === MOCK_MY_MEMBER_ID);
    expect(me).toMatchObject({ birthYear: null, gender: 'FEMALE' });
  });

  it('편집 중 동의가 철회돼 칸이 숨겨지면 숨은 출생연도 값이 저장을 막지 않는다', async () => {
    const user = userEvent.setup();
    const profile = { nickname: '으누', birthYear: 2003, gender: 'male' as const };
    const checkNickname = vi.fn((_nickname: string) => Promise.resolve(true));
    const { rerender } = render(
      <ProfileEditScreen profile={profile} demographicsConsent checkNickname={checkNickname} />,
      { wrapper: createQueryWrapper() },
    );

    const birthYear = screen.getByRole('textbox', { name: /출생연도/ });
    await user.clear(birthYear);
    await user.type(birthYear, '20');
    rerender(
      <ProfileEditScreen
        profile={profile}
        demographicsConsent={false}
        checkNickname={checkNickname}
      />,
    );
    expect(screen.queryByRole('textbox', { name: /출생연도/ })).toBeNull();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
  });

  it('동의하지 않았으면 출생연도·성별을 보내지 않는다', async () => {
    let sent: unknown;
    server.use(
      http.put('/api/members/me/profile', async ({ request }) => {
        const part = (await request.formData()).get('profile');
        sent = part instanceof Blob ? JSON.parse(await part.text()) : null;
        return HttpResponse.json({ success: true, data: { memberId: 5, nickname: '으누누' } });
      }),
    );
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/my'));
    expect(sent).toEqual({ nickname: '으누누', imageAction: 'KEEP' });
  });

  it('저장할 때 서버가 닉네임 중복으로 거절하면 오류를 보이고 닉네임 입력으로 초점을 옮긴다', async () => {
    server.use(http.put('/api/members/me/profile', () => fail(409, 'USER_002')));
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());

    expect(await screen.findByText('이미 사용 중인 닉네임이에요.')).toBeTruthy();
    expect(document.activeElement).toBe(nicknameInput());
    expect(submitButton().disabled).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  /** 프로필 저장 응답을 `release`를 부를 때까지 붙잡음 */
  const holdSave = () => {
    const held = { release: () => undefined as void, responded: false };
    server.use(
      http.put('/api/members/me/profile', async () => {
        await new Promise<void>((resolve) => {
          held.release = resolve;
        });
        held.responded = true;
        return HttpResponse.json({
          success: true,
          data: { memberId: MOCK_MY_MEMBER_ID, nickname: '으누누', imageUrl: null },
        });
      }),
    );
    return held;
  };

  it('저장 중에는 닉네임·사진을 바꿀 수 없다', async () => {
    holdSave();
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());

    await waitFor(() => expect(nicknameInput()).toBeDisabled());
    expect(screen.getByRole('button', { name: '프로필 사진 변경' })).toBeDisabled();
    expect(submitButton()).toHaveAttribute('aria-busy', 'true');
  });

  it('저장 중 뒤로 가면 저장이 끝나도 다시 이동하거나 완료 토스트를 띄우지 않는다', async () => {
    const held = holdSave();
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());
    await waitFor(() => expect(submitButton()).toHaveAttribute('aria-busy', 'true'));
    await user.click(screen.getByRole('button', { name: '뒤로 가기' }));
    expect(replace).toHaveBeenCalledTimes(1);

    held.release();
    await waitFor(() => expect(held.responded).toBe(true));
    // 응답 뒤 성공 처리(내 프로필 다시 받기 포함)가 끝날 시간을 둠
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(toastAfterNavigation).not.toHaveBeenCalled();
  });

  it('저장이 실패하면 머물러 토스트를 띄우고 다시 누를 수 있다', async () => {
    server.use(http.put('/api/members/me/profile', () => fail(500, 'COMMON_500')));
    const user = userEvent.setup();
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    await waitForEnabled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('MY에서 들어왔으면 저장 뒤 그 기록으로 돌아간다(MY 기록을 쌓지 않음)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    renderScreen();

    await user.type(nicknameInput(), '누');
    await waitForEnabled();
    await user.click(submitButton());

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
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
    await waitFor(() => expect(toastAfterNavigation).toHaveBeenCalled());

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
