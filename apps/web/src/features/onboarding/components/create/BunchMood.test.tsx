import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { toast } from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../../contexts/CreateBunchDraftProvider';
import { BunchMood } from './BunchMood';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: vi.fn(),
}));

const Query = createQueryWrapper();
const Providers = ({ children }: { children: ReactNode }) => (
  <Query>
    <CreateBunchDraftProvider>
      <>{children}</>
    </CreateBunchDraftProvider>
  </Query>
);
// 3단계 가드 통과를 위한 1·2단계 완료 상태
const AfterDescription = ({ children }: { children: ReactNode }) => (
  <Query>
    <CreateBunchDraftProvider
      initial={{ name: '퇴근런클럽', visibility: 'public', description: '퇴근 후 달리는 모임' }}
    >
      <>{children}</>
    </CreateBunchDraftProvider>
  </Query>
);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));

const renderStep = () => render(<BunchMood />, { wrapper: AfterDescription });
const submitButton = () => screen.getByRole('button', { name: '번치 만들기' });

describe('BunchMood', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
    vi.mocked(toast).mockClear();
  });

  it('화면 제목을 보여 준다', () => {
    renderStep();

    expect(
      screen.getByRole('heading', { level: 1, name: '우리 번치는 어떤 성격의 모임인가요?' }),
    ).toBeTruthy();
  });

  it('분위기 카드 4개 중 처음에는 아무것도 선택되지 않고 번치 만들기는 비활성이다', () => {
    renderStep();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios.every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect((submitButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('group', { name: '우리 번치는 어떤 성격의 모임인가요?' })).toBeTruthy();
  });

  it('카드를 고르면 번치 만들기가 활성화되고 다른 카드를 고르면 기존 선택이 해제된다', async () => {
    renderStep();

    await userEvent.click(screen.getByRole('radio', { name: '활발한 모임' }));
    expect(screen.getByRole('radio', { name: '활발한 모임' })).toHaveProperty('checked', true);
    expect((submitButton() as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(screen.getByRole('radio', { name: '낭만적인 모임' }));
    expect(screen.getByRole('radio', { name: '낭만적인 모임' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: '활발한 모임' })).toHaveProperty('checked', false);
  });

  it('성격을 고른 뒤 번치 만들기를 누르면 서버에 만들고 생성 결과를 남긴 뒤 완료 화면으로 이동한다', async () => {
    let sent: { key: string | null; body: unknown } | undefined;
    server.use(
      http.post('/api/bunches', async ({ request }) => {
        sent = { key: request.headers.get('idempotency-key'), body: await request.json() };
        return ok({ id: 9, name: '퇴근런클럽', characterType: 'TYPE_1', imageUrl: null });
      }),
    );
    const Probe = () => {
      const { createdBunch, name } = useCreateBunchDraft();
      return <output aria-label="기록">{`${createdBunch?.id ?? '없음'}/${name}`}</output>;
    };
    render(
      <>
        <BunchMood />
        <Probe />
      </>,
      { wrapper: AfterDescription },
    );

    await userEvent.click(screen.getByRole('radio', { name: '개성 넘치는 모임' }));
    await userEvent.click(submitButton());

    // 뒤로 가기를 통한 중복 생성 방지를 위해 replace 확인
    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchComplete));
    expect(push).not.toHaveBeenCalled();
    expect(sent?.body).toEqual({
      name: '퇴근런클럽',
      introduction: '퇴근 후 달리는 모임',
      visibility: 'PUBLIC',
      characterType: 'TYPE_1',
    });
    expect(sent?.key).toMatch(/^[0-9a-f-]{36}$/);
    // 생성 결과는 남기고 입력값은 비움
    expect(screen.getByLabelText('기록').textContent).toBe('9/');
  });

  it('실패한 뒤 같은 입력으로 다시 누르면 같은 멱등 키로 보낸다', async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.post('/api/bunches', ({ request }) => {
        keys.push(request.headers.get('idempotency-key'));
        return keys.length === 1
          ? fail(503, 'AUTH_018')
          : ok({ id: 9, name: '퇴근런클럽', characterType: 'TYPE_1', imageUrl: null });
      }),
    );
    renderStep();

    await userEvent.click(screen.getByRole('radio', { name: '개성 넘치는 모임' }));
    await userEvent.click(submitButton());
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(submitButton());

    await waitFor(() => expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchComplete));
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('이름이 이미 쓰이고 있으면 1단계로 보내 이름을 다시 고르게 한다', async () => {
    server.use(http.post('/api/bunches', () => fail(409, 'BUNCH_001')));
    const Probe = () => (
      <output aria-label="거절">{useCreateBunchDraft().takenName ?? '없음'}</output>
    );
    render(
      <>
        <BunchMood />
        <Probe />
      </>,
      { wrapper: AfterDescription },
    );

    await userEvent.click(screen.getByRole('radio', { name: '개성 넘치는 모임' }));
    await userEvent.click(submitButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch));
    expect(screen.getByLabelText('거절').textContent).toBe('퇴근런클럽');
    expect(replace).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('소속 번치가 이미 10개면 한도 안내를 하고 만들지 않는다', async () => {
    server.use(http.post('/api/bunches', () => fail(409, 'BUNCH_003')));
    renderStep();

    await userEvent.click(screen.getByRole('radio', { name: '개성 넘치는 모임' }));
    await userEvent.click(submitButton());

    await waitFor(() => expect(toast).toHaveBeenCalledWith('참여할 수 있는 번치는 최대 10개예요.'));
    expect(replace).not.toHaveBeenCalled();
    expect((submitButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('성격을 고르기 전에는 번치 만들기를 눌러도 이동하지 않는다', async () => {
    renderStep();

    await userEvent.click(submitButton());

    expect(push).not.toHaveBeenCalled();
  });

  it.each([
    ['개성 넘치는 모임', 'TYPE_1'],
    ['활발한 모임', 'TYPE_2'],
    ['낭만적인 모임', 'TYPE_3'],
    ['차분한 모임', 'TYPE_4'],
  ])('「%s」를 고르면 성격 값이 서버 캐릭터 타입 %s가 된다', async (label, type) => {
    const MoodProbe = () => <output aria-label="성격 값">{useCreateBunchDraft().mood}</output>;
    render(
      <>
        <BunchMood />
        <MoodProbe />
      </>,
      { wrapper: AfterDescription },
    );

    await userEvent.click(screen.getByRole('radio', { name: label }));

    expect(screen.getByLabelText('성격 값').textContent).toBe(type);
  });

  it('이전은 이전 화면으로 돌아간다', async () => {
    renderStep();

    await userEvent.click(screen.getByRole('button', { name: '이전' }));

    expect(back).toHaveBeenCalledTimes(1);
  });
});

describe('BunchMood 직접 진입', () => {
  it('2단계를 마치지 않고 들어오면 화면을 그리지 않고 마치지 못한 첫 단계로 되돌린다', () => {
    replace.mockClear();
    render(<BunchMood />, { wrapper: Providers });

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(replace).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunch);
  });
});
