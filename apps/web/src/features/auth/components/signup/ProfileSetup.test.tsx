import type * as DesignSystem from '@app/design-system';
import { toast } from '@app/design-system';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHECK_FAILURE_MESSAGE } from '../../hooks/useNicknameAvailability';
import { NICKNAME_INVALID_MESSAGE, NICKNAME_TAKEN_MESSAGE } from '../../lib/nickname';
import { ProfileSetup } from './ProfileSetup';

const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back }) }));
// 토스트 표시는 DS의 `toast()`가 맡으므로 호출만 막는다
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

type PickerOptions = { onError?: (_error: Error) => void };
const picker = vi.hoisted(() => {
  const options: PickerOptions = {};
  return {
    photoUrl: undefined as string | undefined,
    isPending: false,
    options,
    inputRef: { current: null },
    handleCameraClick: vi.fn(),
    handleFileChange: vi.fn(),
  };
});
vi.mock('@/shared/hooks/usePhotoPicker', () => ({
  usePhotoPicker: (options: PickerOptions) => {
    picker.options = options;
    return picker;
  },
}));

const NEXT_PATH = '/next';
const nickname = () => screen.getByRole('textbox', { name: '닉네임' });
const birthYear = () => screen.getByRole('textbox', { name: '출생연도' });
const start = () => screen.getByRole('button', { name: 'BUNCH 시작하기' });
const female = () => screen.getByRole('button', { name: '여성' });
const male = () => screen.getByRole('button', { name: '남성' });

describe('ProfileSetup', () => {
  beforeEach(() => {
    replace.mockClear();
    back.mockClear();
    picker.photoUrl = undefined;
    picker.isPending = false;
    vi.mocked(toast).mockClear();
    picker.handleCameraClick.mockClear();
  });

  it('화면 제목(h1)과 본문 영역(main), 헤더의 뒤로 가기 버튼을 가진다', async () => {
    render(<ProfileSetup nextPath={NEXT_PATH} />);

    expect(
      screen.getByRole('heading', { level: 1, name: '먼저 나를 소개해 볼까요?' }),
    ).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();

    await userEvent.click(
      within(screen.getByRole('banner')).getByRole('button', { name: '뒤로 가기' }),
    );
    expect(back).toHaveBeenCalledTimes(1);
  });

  describe('프로필 사진', () => {
    it('사진 변경 버튼을 누르면 사진 선택을 시작한다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.click(screen.getByRole('button', { name: '프로필 사진 변경' }));

      expect(picker.handleCameraClick).toHaveBeenCalledTimes(1);
    });

    it('사진 변경 버튼은 누르는 중에는 키보드를 닫지 않고, 클릭 뒤에 닫는다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.click(nickname());
      const camera = screen.getByRole('button', { name: '프로필 사진 변경' });

      fireEvent.pointerDown(camera);
      expect(document.activeElement).toBe(nickname());

      fireEvent.click(camera);
      expect(document.activeElement).not.toBe(nickname());
    });

    it('선택한 사진을 프로필 이미지로 보여 준다', () => {
      picker.photoUrl = 'data:image/jpeg;base64,YWJj';
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      expect(document.querySelector(`img[src="${picker.photoUrl}"]`)).toBeTruthy();
    });

    it('사진을 사용할 수 없으면 기획의 문구로 토스트를 띄운다', () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      picker.options.onError?.(new Error('실패'));

      expect(toast).toHaveBeenCalledWith('이 사진은 사용할 수 없어요.');
    });
  });

  it('기본 프로필 이미지와 사진 변경 버튼을 보여 준다', () => {
    render(<ProfileSetup nextPath={NEXT_PATH} />);

    expect(screen.getByRole('button', { name: '프로필 사진 변경' })).toBeTruthy();
    expect(document.querySelector('img[src="/images/default-bunch.png"]')).toBeTruthy();
  });

  it('처음에는 시작하기 버튼이 비활성이고 글자 수는 0/12다', () => {
    render(<ProfileSetup nextPath={NEXT_PATH} />);

    expect(start().hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('0/12')).toBeTruthy();
  });

  it('필수 표시와 선택 표시를 각 항목 옆에 보여 준다', () => {
    render(<ProfileSetup nextPath={NEXT_PATH} />);

    expect(screen.getByText('필수')).toBeTruthy();
    expect(screen.getAllByText('선택')).toHaveLength(2);
    expect(nickname().getAttribute('aria-required')).toBe('true');
  });

  describe('닉네임', () => {
    it('입력하면 글자 수가 갱신되고 시작하기가 활성화된다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '지원');

      expect(screen.getByText('2/12')).toBeTruthy();
      expect(start().hasAttribute('disabled')).toBe(false);
    });

    it('12자까지만 입력할 수 있다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '가나다라마바사아자차카타파');

      expect(nickname()).toHaveProperty('value', '가나다라마바사아자차카타');
      expect(screen.getByText('12/12')).toBeTruthy();
    });

    it('특수문자가 있으면 오류 문구를 보이고 시작하기를 비활성화한다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '지@원');

      expect(screen.getByRole('alert').textContent).toBe(NICKNAME_INVALID_MESSAGE);
      expect(nickname().getAttribute('aria-invalid')).toBe('true');
      expect(start().hasAttribute('disabled')).toBe(true);
    });

    it('허용되지 않는 문자를 지우면 오류가 사라진다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '지원!');
      expect(screen.getByRole('alert')).toBeTruthy();
      await userEvent.type(nickname(), '{Backspace}');

      expect(screen.queryByRole('alert')).toBeNull();
      expect(start().hasAttribute('disabled')).toBe(false);
    });

    it('이모지는 허용하지 않는다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '지원😀');

      expect(screen.getByRole('alert').textContent).toBe(NICKNAME_INVALID_MESSAGE);
    });

    it('공백만 입력하면 빈 값으로 보아 시작하기가 비활성이다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '   ');

      expect(start().hasAttribute('disabled')).toBe(true);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('한글 조합 중인 자모는 오류로 보지 않지만 시작할 수는 없고, 조합이 끝나면 다시 검사한다', () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      fireEvent.compositionStart(nickname());
      fireEvent.change(nickname(), { target: { value: '지ㅇ' } });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(start().hasAttribute('disabled')).toBe(true);

      fireEvent.compositionEnd(nickname());
      expect(screen.getByRole('alert').textContent).toBe(NICKNAME_INVALID_MESSAGE);
    });

    it('조합이 끝난 완성된 글자는 조합 중에도 시작할 수 있다', () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      fireEvent.compositionStart(nickname());
      fireEvent.change(nickname(), { target: { value: '지원' } });

      expect(start().hasAttribute('disabled')).toBe(false);
    });
  });

  describe('닉네임 중복 확인', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    const type = async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.type(nickname(), '지원');
    };
    const settle = () => act(() => vi.advanceTimersByTimeAsync(500));

    it('확인 중에는 시작하기가 비활성이다', async () => {
      const check = vi.fn(() => Promise.resolve(true));
      render(<ProfileSetup nextPath={NEXT_PATH} checkNickname={check} />);

      await type();

      expect(start().hasAttribute('disabled')).toBe(true);
    });

    it('사용할 수 있는 닉네임이면 시작하기가 활성화된다', async () => {
      const check = vi.fn(() => Promise.resolve(true));
      render(<ProfileSetup nextPath={NEXT_PATH} checkNickname={check} />);

      await type();
      await settle();

      expect(check).toHaveBeenCalledWith('지원');
      expect(start().hasAttribute('disabled')).toBe(false);
    });

    it('이미 사용 중이면 오류 문구를 보이고 시작하기를 비활성화한다', async () => {
      const check = vi.fn(() => Promise.resolve(false));
      render(<ProfileSetup nextPath={NEXT_PATH} checkNickname={check} />);

      await type();
      await settle();

      expect(screen.getByRole('alert').textContent).toBe(NICKNAME_TAKEN_MESSAGE);
      expect(start().hasAttribute('disabled')).toBe(true);
    });

    it('조합 중인 자모로는 중복 확인을 호출하지 않는다', async () => {
      const check = vi.fn(() => Promise.resolve(true));
      render(<ProfileSetup nextPath={NEXT_PATH} checkNickname={check} />);

      fireEvent.compositionStart(nickname());
      fireEvent.change(nickname(), { target: { value: '지ㅇ' } });
      await settle();

      expect(check).not.toHaveBeenCalled();
    });

    it('확인에 실패하면 안내 문구가 남고 시작하기가 비활성인 채로 남는다', async () => {
      const check = vi.fn(() => Promise.reject(new Error('network')));
      render(<ProfileSetup nextPath={NEXT_PATH} checkNickname={check} />);

      await type();
      await settle();

      expect(screen.getByRole('alert').textContent).toBe(CHECK_FAILURE_MESSAGE);
      expect(start().hasAttribute('disabled')).toBe(true);
    });
  });

  describe('출생연도', () => {
    // 해가 바뀌는 시점에 흔들리지 않게 날짜를 고정한다(타이머는 진짜를 쓴다)
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-06-01T00:00:00'));
    });
    afterEach(() => vi.useRealTimers());

    it('숫자 키보드로 입력하고 숫자만 4자리까지 받는다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(birthYear(), '19a9-812');

      expect(birthYear()).toHaveProperty('value', '1998');
      expect(birthYear().getAttribute('inputmode')).toBe('numeric');
      const describedBy = birthYear().getAttribute('aria-describedby') ?? '';
      expect(
        describedBy
          .split(' ')
          .some((id) => document.getElementById(id)?.textContent === '숫자 4자리로 입력해 주세요.'),
      ).toBe(true);
    });

    it('비어 있어도 시작할 수 있다(선택 입력)', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '지원');

      expect(start().hasAttribute('disabled')).toBe(false);
    });

    it('범위 안의 4자리를 입력하면 시작할 수 있다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '지원');
      await userEvent.type(birthYear(), '1998');

      expect(screen.queryByRole('alert')).toBeNull();
      expect(start().hasAttribute('disabled')).toBe(false);
    });

    it('1930년보다 이르거나 현재 연도 − 14년보다 늦으면 안내하고 시작할 수 없다', async () => {
      const max = 2012;
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.type(nickname(), '지원');

      await userEvent.type(birthYear(), '1929');
      expect(screen.getByRole('alert').textContent).toBe(
        `1930년부터 ${max}년 사이로 입력해 주세요.`,
      );
      expect(start().hasAttribute('disabled')).toBe(true);

      await userEvent.clear(birthYear());
      await userEvent.type(birthYear(), String(max + 1));
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(start().hasAttribute('disabled')).toBe(true);
    });

    it('4자리를 다 쓰기 전에는 안내하지 않다가 포커스를 벗어나면 안내한다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.type(nickname(), '지원');

      await userEvent.type(birthYear(), '199');
      expect(screen.queryByRole('alert')).toBeNull();
      expect(start().hasAttribute('disabled')).toBe(true);

      await userEvent.tab();
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  describe('성별', () => {
    it('처음에는 아무것도 선택되어 있지 않다', () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      expect(female().getAttribute('aria-pressed')).toBe('false');
      expect(male().getAttribute('aria-pressed')).toBe('false');
    });

    it('하나만 선택되고 다른 항목을 누르면 선택이 옮겨 간다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.click(female());
      expect(female().getAttribute('aria-pressed')).toBe('true');
      expect(male().getAttribute('aria-pressed')).toBe('false');

      await userEvent.click(male());
      expect(female().getAttribute('aria-pressed')).toBe('false');
      expect(male().getAttribute('aria-pressed')).toBe('true');
    });

    it('선택한 항목을 다시 누르면 해제된다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.click(female());
      await userEvent.click(female());

      expect(female().getAttribute('aria-pressed')).toBe('false');
    });

    it('선택하지 않아도 시작할 수 있다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      await userEvent.type(nickname(), '지원');

      expect(start().hasAttribute('disabled')).toBe(false);
    });

    it('공개 안내 문구를 출생연도 입력과 성별 그룹의 설명으로 연결한다', () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      const note = screen.getByText('출생연도와 성별은 다른 사용자에게 공개되지 않아요.');

      expect(birthYear().getAttribute('aria-describedby')).toContain(note.id);
      expect(screen.getByRole('group', { name: '성별' }).getAttribute('aria-describedby')).toBe(
        note.id,
      );
    });

    it('공개되지 않는다는 안내 문구를 성별 아래에 보여 준다', () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);

      expect(screen.getByText('출생연도와 성별은 다른 사용자에게 공개되지 않아요.')).toBeTruthy();
    });
  });

  it('시작하기를 누르면 지정한 경로로 이동한다', async () => {
    render(<ProfileSetup nextPath={NEXT_PATH} />);
    await userEvent.type(nickname(), '지원');

    await userEvent.click(start());

    expect(replace).toHaveBeenCalledWith(NEXT_PATH);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  describe('키보드', () => {
    it('빈 영역을 누르면 입력창 포커스가 풀려 키보드가 닫힌다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.click(nickname());
      expect(document.activeElement).toBe(nickname());

      await userEvent.click(screen.getByText('먼저 나를 소개해 볼까요?'));

      expect(document.activeElement).not.toBe(nickname());
    });

    it('시작하기를 누르면 입력창 포커스가 풀린다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.type(nickname(), '지원');

      await userEvent.click(start());

      expect(document.activeElement).not.toBe(nickname());
    });

    it('성별 버튼을 누르는 중에는 키보드를 닫지 않아 탭이 사라지고, 선택이 끝나면 닫힌다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.click(nickname());

      fireEvent.pointerDown(female());
      expect(document.activeElement).toBe(nickname());

      fireEvent.click(female());
      expect(female().getAttribute('aria-pressed')).toBe('true');
      expect(document.activeElement).not.toBe(nickname());
    });

    it('시작하기를 누르는 중에는 키보드를 닫지 않고, 눌러서 이동할 때 닫는다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.type(nickname(), '지원');

      fireEvent.pointerDown(start());
      expect(document.activeElement).toBe(nickname());
      expect(start().hasAttribute('disabled')).toBe(false);

      fireEvent.click(start());
      expect(replace).toHaveBeenCalledWith(NEXT_PATH);
      expect(document.activeElement).not.toBe(nickname());
    });

    it('다른 입력창을 누르면 포커스가 그대로 옮겨 간다', async () => {
      render(<ProfileSetup nextPath={NEXT_PATH} />);
      await userEvent.click(nickname());

      await userEvent.click(birthYear());

      expect(document.activeElement).toBe(birthYear());
    });
  });
});
