import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { BunchProfileEdit } from './BunchProfileEdit';
import { BunchProfileEditScreen } from './BunchProfileEditScreen';

const replace = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, back }) }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => {
  sessionStorage.clear();
  replace.mockClear();
  back.mockClear();
  toast.mockClear();
  onSaved.mockClear();
});

const privateBunch = {
  name: '퇴근런클럽',
  description: '매주 화·목 퇴근 후 함께 뛰는 러닝크루',
  isPrivate: true,
  imageSrc: undefined,
};
const onSaved = vi.fn();
const renderScreen = () =>
  render(<BunchProfileEditScreen initial={privateBunch} onBack={vi.fn()} onSaved={onSaved} />);
const saveButton = () => screen.getByRole('button', { name: '저장하기' });

describe('BunchProfileEditScreen', () => {
  it('저장된 값으로 채우고, 바뀐 내용이 없으면 저장하기를 막는다', () => {
    renderScreen();

    expect(screen.getByRole('textbox', { name: '번치 이름' })).toHaveProperty(
      'value',
      '퇴근런클럽',
    );
    expect(screen.getByRole('radio', { name: '비공개' })).toHaveProperty('checked', true);
    expect(saveButton()).toHaveProperty('disabled', true);
  });

  it('이름을 바꿔 저장하면 바뀐 값으로 onSaved를 부른다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.clear(screen.getByRole('textbox', { name: '번치 이름' }));
    await user.type(screen.getByRole('textbox', { name: '번치 이름' }), 'GTX러닝');
    expect(saveButton()).toHaveProperty('disabled', false);
    await user.click(saveButton());

    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: 'GTX러닝' }));
  });

  it('특수문자 이름과 빈 소개는 저장할 수 없다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByRole('textbox', { name: '번치 이름' }), '!');
    expect(screen.getByText('특수문자를 제외한 영문, 한글만 사용할 수 있어요.')).toBeTruthy();
    expect(saveButton()).toHaveProperty('disabled', true);

    await user.clear(screen.getByRole('textbox', { name: '번치 이름' }));
    await user.type(screen.getByRole('textbox', { name: '번치 이름' }), '러닝');
    await user.clear(screen.getByRole('textbox', { name: '한 줄 소개' }));
    expect(saveButton()).toHaveProperty('disabled', true);
  });

  it('비공개 번치를 공개로 바꾸면 팔로우 요청 승인 안내를 보여 주고 읽어 준다', async () => {
    const user = userEvent.setup();
    renderScreen();
    const status = () =>
      screen.getAllByRole('status').find((el) => /팔로우 요청/.test(el.textContent ?? ''));

    expect(status()).toBeUndefined();
    await user.click(screen.getByRole('radio', { name: '공개' }));

    // 공개를 고르는 순간 status에 문구가 들어가 읽힘. 화면용 문구는 펼쳐짐(전환)
    expect(status()?.textContent).toMatch(/대기 중인 팔로우 요청은 모두 승인돼요/);
    expect(saveButton()).toHaveProperty('disabled', false);

    await user.click(screen.getByRole('radio', { name: '비공개' }));
    expect(status()).toBeUndefined();
  });

  it('빈 영역을 누르면 키보드를 닫고, 다른 입력을 누르면 포커스만 옮긴다', async () => {
    const user = userEvent.setup();
    renderScreen();
    const name = screen.getByRole('textbox', { name: '번치 이름' });
    const description = screen.getByRole('textbox', { name: '한 줄 소개' });

    await user.click(name);
    await user.click(description);
    expect(document.activeElement).toBe(description);

    await user.click(screen.getByText('공개 범위'));
    expect(document.activeElement).not.toBe(description);
  });

  it('값을 모르면(첫 hydration) 폼을 그리지 않는다', () => {
    render(<BunchProfileEditScreen initial={undefined} onBack={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: '번치 프로필 편집' })).toBeTruthy();
  });
});

describe('BunchProfileEdit', () => {
  it('메인 관리자가 아닌 번치면 더보기 메뉴로 돌려보낸다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-gift');
    render(<BunchProfileEdit />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.menu));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('메인 관리자 번치는 그 번치 값으로 채운다', () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
    render(<BunchProfileEdit />);

    expect(screen.getByRole('textbox', { name: '번치 이름' })).toHaveProperty(
      'value',
      '퇴근런클럽',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('기본 번치(공동 관리자)로 들어오면 더보기 메뉴로 돌려보낸다', async () => {
    render(<BunchProfileEdit />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.menu));
  });
  // 편집 값 저장소가 모듈에 남으므로 이 파일의 마지막 테스트로 둠
  it('저장하면 바로 번치 메인탭으로 이동하고 성공 토스트를 띄운다', async () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'bunch-run');
    const user = userEvent.setup();
    render(<BunchProfileEdit />);

    await user.click(screen.getByRole('radio', { name: '공개' }));
    await user.click(saveButton());

    expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home);
    expect(toast).toHaveBeenCalledWith(
      '번치 프로필을 수정했어요.',
      expect.objectContaining({ icon: 'success' }),
    );
  });
});
