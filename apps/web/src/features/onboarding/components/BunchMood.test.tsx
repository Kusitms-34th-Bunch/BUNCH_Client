import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayProvider } from 'overlay-kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_PATHS } from '../constants/paths';
import { CreateBunchDraftProvider } from '../model/CreateBunchDraftProvider';
import { BunchMood } from './BunchMood';

const push = vi.fn();
const back = vi.fn();
const replace = vi.fn();
const Providers = ({ children }: { children: ReactNode }) => (
  <CreateBunchDraftProvider>
    <OverlayProvider>{children}</OverlayProvider>
  </CreateBunchDraftProvider>
);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace }) }));

const renderStep = () => render(<BunchMood />, { wrapper: Providers });
const submitButton = () => screen.getByRole('button', { name: '번치 만들기' });

describe('BunchMood', () => {
  beforeEach(() => {
    push.mockClear();
    back.mockClear();
    replace.mockClear();
  });

  it('화면 제목을 보여 준다', () => {
    renderStep();

    expect(
      screen.getByRole('heading', { level: 1, name: '우리 번치는 어떤 분위기인가요?' }),
    ).toBeTruthy();
  });

  it('분위기 카드 4개 중 처음에는 아무것도 선택되지 않고 번치 만들기는 비활성이다', () => {
    renderStep();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(radios.every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect((submitButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('group', { name: '우리 번치는 어떤 분위기인가요?' })).toBeTruthy();
  });

  it('카드를 고르면 번치 만들기가 활성화되고 다른 카드를 고르면 기존 선택이 해제된다', async () => {
    renderStep();

    await userEvent.click(screen.getByRole('radio', { name: '분위기 2' }));
    expect(screen.getByRole('radio', { name: '분위기 2' })).toHaveProperty('checked', true);
    expect((submitButton() as HTMLButtonElement).disabled).toBe(false);

    await userEvent.click(screen.getByRole('radio', { name: '분위기 3' }));
    expect(screen.getByRole('radio', { name: '분위기 3' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: '분위기 2' })).toHaveProperty('checked', false);
  });

  it('분위기를 고른 뒤 번치 만들기를 누르면 완료 화면으로 이동한다', async () => {
    renderStep();

    await userEvent.click(screen.getByRole('radio', { name: '분위기 1' }));
    await userEvent.click(submitButton());

    expect(push).toHaveBeenCalledWith(ONBOARDING_PATHS.createBunchComplete);
    expect(replace).not.toHaveBeenCalled();
  });

  it('분위기를 고르기 전에는 번치 만들기를 눌러도 이동하지 않는다', async () => {
    renderStep();

    await userEvent.click(submitButton());

    expect(push).not.toHaveBeenCalled();
  });

  it('이전은 이전 화면으로 돌아간다', async () => {
    renderStep();

    await userEvent.click(screen.getByRole('button', { name: '이전' }));

    expect(back).toHaveBeenCalledTimes(1);
  });
});
