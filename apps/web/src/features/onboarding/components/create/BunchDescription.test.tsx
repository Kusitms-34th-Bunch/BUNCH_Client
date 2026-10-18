import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { CreateBunchDraftProvider } from '../../contexts/CreateBunchDraftProvider';
import { BunchBasicInfo } from './BunchBasicInfo';
import { BunchDescription } from './BunchDescription';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
const Providers = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider>
    <OverlayProvider>{children}</OverlayProvider>
  </CreateBunchDraftProvider>
);
// 1단계를 마친 상태(가드를 통과). 2단계 화면은 이 상태로 시작한다
const AfterBasicInfo = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider initial={{ name: '퇴근런클럽', visibility: 'public' }}>
    <OverlayProvider>{children}</OverlayProvider>
  </CreateBunchDraftProvider>
);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));

const renderStep = () => render(<BunchDescription />, { wrapper: AfterBasicInfo });
const input = () => screen.getByRole('textbox', { name: '한 줄 소개' });
const nextButton = () => screen.getByRole('button', { name: '다음' });

describe('BunchDescription', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
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

    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchMood);
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
