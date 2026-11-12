import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { getBunchHome } from '../../api/bunchHome';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { BunchProfileEdit } from './BunchProfileEdit';
import { BunchProfileEditScreen } from './BunchProfileEditScreen';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

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
  onSave.mockClear();
});

const privateBunch = {
  name: '퇴근런클럽',
  description: '매주 화·목 퇴근 후 함께 뛰는 러닝크루',
  isPrivate: true,
  imageSrc: undefined,
};
const onSave = vi.fn();
const renderScreen = () =>
  render(<BunchProfileEditScreen initial={privateBunch} onBack={vi.fn()} onSave={onSave} />);
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

  it('이름을 바꿔 저장하면 바뀐 값과 사진 그대로(KEEP)로 onSave를 부른다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.clear(screen.getByRole('textbox', { name: '번치 이름' }));
    await user.type(screen.getByRole('textbox', { name: '번치 이름' }), 'GTX러닝');
    expect(saveButton()).toHaveProperty('disabled', false);
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'GTX러닝', image: { action: 'KEEP' } }),
    );
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

  it('다른 번치가 쓰는 이름이면 사용 중으로 보이고 저장할 수 없다(지금 이름은 묻지 않음)', async () => {
    const checkName = vi.fn<(_name: string) => Promise<boolean>>().mockResolvedValue(false);
    const user = userEvent.setup();
    render(
      <BunchProfileEditScreen
        initial={privateBunch}
        onBack={vi.fn()}
        onSave={onSave}
        checkName={checkName}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: '번치 이름' }), '2');
    expect(await screen.findByText('이미 사용 중인 번치 이름이에요')).toBeTruthy();
    expect(saveButton()).toHaveProperty('disabled', true);
    expect(checkName).not.toHaveBeenCalledWith('퇴근런클럽');
  });

  it('저장 때 서버가 거절한 이름은 사용 중으로 보이고, 저장 중에는 저장하기를 막는다', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BunchProfileEditScreen
        initial={privateBunch}
        onBack={vi.fn()}
        onSave={onSave}
        takenName="퇴근런클럽"
      />,
    );
    // 지금 이름과 같아 확인 요청 없이 거절 결과만 반영
    expect(screen.getByText('이미 사용 중인 번치 이름이에요')).toBeTruthy();

    // 바뀐 값이 있어 저장할 수 있는 상태에서 저장 요청이 시작되면 막음
    rerender(<BunchProfileEditScreen initial={privateBunch} onBack={vi.fn()} onSave={onSave} />);
    await user.click(screen.getByRole('radio', { name: '공개' }));
    expect(saveButton()).toHaveProperty('disabled', false);
    rerender(
      <BunchProfileEditScreen initial={privateBunch} onBack={vi.fn()} onSave={onSave} saving />,
    );
    expect(saveButton()).toHaveProperty('disabled', true);
  });

  it('폼을 연 뒤 받은 값이 바뀌어도 입력·비교·저장 버전은 연 때 그대로다', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BunchProfileEditScreen
        initial={{ ...privateBunch, profileVersion: 1 }}
        onBack={vi.fn()}
        onSave={onSave}
      />,
    );
    // 다른 기기에서 이름이 바뀐 값을 뒤에서 다시 받음
    rerender(
      <BunchProfileEditScreen
        initial={{ ...privateBunch, name: '새이름', profileVersion: 2 }}
        onBack={vi.fn()}
        onSave={onSave}
      />,
    );
    expect(screen.getByRole('textbox', { name: '번치 이름' })).toHaveProperty(
      'value',
      '퇴근런클럽',
    );
    expect(saveButton()).toHaveProperty('disabled', true);

    await user.click(screen.getByRole('radio', { name: '공개' }));
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ expectedProfileVersion: 1 }));
  });

  it('값을 모르면(첫 hydration) 폼을 그리지 않는다', () => {
    render(<BunchProfileEditScreen initial={undefined} onBack={vi.fn()} onSave={vi.fn()} />);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: '번치 프로필 편집' })).toBeTruthy();
  });
});

// 가짜 서버로 내 기본 번치(여행쥬아)를 받아 편집하는 흐름. 시연 회원은 기본적으로 일반 멤버라 메인 관리자로 바꿔 씀
describe('BunchProfileEdit', () => {
  const makeMeOwner = () =>
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.map((item) =>
        item.bunchId === MOCK_BUNCH_ID && item.memberId === MOCK_MY_MEMBER_ID
          ? { ...item, role: 'OWNER' }
          : item,
      ),
    }));
  const renderEdit = () =>
    render(<BunchProfileEdit />, { wrapper: createQueryWrapper(createTestQueryClient()) });
  const nameField = () => screen.findByRole('textbox', { name: '번치 이름' });

  it('프로필을 바꿀 권한이 없으면 더보기 메뉴로 돌려보낸다', async () => {
    renderEdit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.menu));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('서버가 프로필 버전을 주지 않으면 저장할 수 없어 폼 대신 다시 시도를 보인다', async () => {
    makeMeOwner();
    const real = await getBunchHome(String(MOCK_BUNCH_ID));
    server.use(http.get('/api/bunches/:bunchId/home', () => ok({ ...real, profileVersion: null })));
    renderEdit();

    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('메인 관리자는 서버의 번치 프로필로 채운다', async () => {
    makeMeOwner();
    renderEdit();

    expect(await nameField()).toHaveProperty('value', '여행쥬아');
    expect(replace).not.toHaveBeenCalled();
  });

  it('저장하면 서버에 반영하고 번치 메인탭으로 이동해 성공 토스트를 띄운다', async () => {
    makeMeOwner();
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('radio', { name: '공개' }));
    await user.click(saveButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home));
    expect(toastAfterNavigation).toHaveBeenCalledWith(
      '번치 프로필을 수정했어요.',
      expect.objectContaining({ icon: 'success' }),
    );
    const saved = await getBunchHome(String(MOCK_BUNCH_ID));
    expect(saved.bunch.visibility).toBe('PUBLIC');
    expect(saved.profileVersion).toBe(2);
  });

  it('확인 뒤 다른 번치가 그 이름을 쓰게 돼 서버가 거절하면 입력란에 사용 중으로 보인다', async () => {
    makeMeOwner();
    // 중복 확인은 통과(그 사이 다른 번치가 이름을 씀)
    server.use(
      http.get('/api/bunches/name-availability', () =>
        ok({ normalizedValue: '퇴근런클럽', available: true }),
      ),
    );
    const user = userEvent.setup();
    renderEdit();

    await user.clear(await nameField());
    await user.type(screen.getByRole('textbox', { name: '번치 이름' }), '퇴근런클럽');
    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false));
    await user.click(saveButton());

    expect(await screen.findByText('이미 사용 중인 번치 이름이에요')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('그 사이 다른 곳에서 프로필이 바뀌어 거절되면 최신 내용으로 폼을 다시 열고 알린다', async () => {
    makeMeOwner();
    const user = userEvent.setup();
    renderEdit();
    await user.click(await screen.findByRole('radio', { name: '공개' }));
    // 편집을 연 뒤 다른 기기에서 저장해 버전이 올라감
    mockDb.update((state) => ({
      ...state,
      bunches: state.bunches.map((bunch) =>
        bunch.id === MOCK_BUNCH_ID ? { ...bunch, profileVersion: 5 } : bunch,
      ),
    }));

    await user.click(saveButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        '다른 곳에서 프로필이 바뀌어 최신 내용으로 다시 불러왔어요.',
      ),
    );
    expect(replace).not.toHaveBeenCalled();
    // 고른 「공개」는 버리고 서버 값(비공개)으로 다시 엶. 다시 저장하면 새 버전으로 보냄
    expect(screen.getByRole('radio', { name: '비공개' })).toHaveProperty('checked', true);
    expect(saveButton()).toHaveProperty('disabled', true);

    await user.click(screen.getByRole('radio', { name: '공개' }));
    await user.click(saveButton());
    await waitFor(() => expect(replace).toHaveBeenCalledWith(BUNCH_HOME_PATHS.home));
    expect((await getBunchHome(String(MOCK_BUNCH_ID))).profileVersion).toBe(6);
  });

  it('저장과 다시 받기가 모두 실패해도(오프라인) 오류 화면으로 바꾸지 않고 입력을 유지한다', async () => {
    makeMeOwner();
    const user = userEvent.setup();
    renderEdit();
    await user.click(await screen.findByRole('radio', { name: '공개' }));
    server.use(
      http.put('/api/bunches/:bunchId/profile', () => fail(500, 'COMMON_500')),
      http.get('/api/bunches/:bunchId/home', () => fail(500, 'COMMON_500')),
    );

    await user.click(saveButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        '번치 프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      ),
    );
    expect(screen.getByRole('radio', { name: '공개' })).toHaveProperty('checked', true);
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
  });

  it('저장해 둔 값(앱 다시 열기)이 있어도 서버에서 새로 받은 값으로 연다', async () => {
    makeMeOwner();
    const client = createTestQueryClient();
    const fresh = await getBunchHome(String(MOCK_BUNCH_ID));
    // 지난번 저장본의 옛 이름
    client.setQueryData(['bunch-home', String(MOCK_BUNCH_ID), 'profile'], {
      ...fresh,
      bunch: { ...fresh.bunch, name: '옛이름' },
    });
    render(<BunchProfileEdit />, { wrapper: createQueryWrapper(client) });

    expect(await screen.findByRole('textbox', { name: '번치 이름' })).toHaveProperty(
      'value',
      '여행쥬아',
    );
  });

  it('버전과 무관한 실패면 실패를 알리고 입력을 유지한다', async () => {
    makeMeOwner();
    server.use(http.put('/api/bunches/:bunchId/profile', () => fail(500, 'COMMON_500')));
    const user = userEvent.setup();
    renderEdit();
    await user.click(await screen.findByRole('radio', { name: '공개' }));

    await user.click(saveButton());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        '번치 프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      ),
    );
    expect(screen.getByRole('radio', { name: '공개' })).toHaveProperty('checked', true);
  });
});
