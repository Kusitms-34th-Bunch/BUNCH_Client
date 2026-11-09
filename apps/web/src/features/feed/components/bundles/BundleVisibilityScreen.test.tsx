import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bundleEdits } from '../../lib/bundleEdits';
import { BundleVisibilityScreen } from './BundleVisibilityScreen';

const back = vi.fn();
const replace = vi.fn();
const toast = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back, replace }) }));
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  toast: (...args: unknown[]) => {
    toast(...args);
  },
}));

// fixture의 bundle-1은 여행가조(bunch-trip) 번들이고 나는 메인 관리자, 멤버 공개
const renderScreen = (bundleId = 'bundle-1', bunchPrivate = false) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), {
    memberId: 'me',
    bunch: { id: 'bunch-trip', name: '여행가조' },
  });
  render(<BundleVisibilityScreen bundleId={bundleId} bunchPrivate={bunchPrivate} />, {
    wrapper: createQueryWrapper(client),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  bundleEdits.clear();
});

describe('BundleVisibilityScreen', () => {
  it('지금 공개 범위가 골라져 있고, 바꾸기 전에는 「수정하기」가 꺼져 있다', () => {
    renderScreen();

    expect(
      screen.getByRole('radiogroup', { name: '번들의 공개 범위를 설정해 주세요' }),
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: /멤버 공개/ })).toBeChecked();
    expect(screen.getByRole('button', { name: '수정하기' })).toBeDisabled();
  });

  it('바꾸고 「수정하기」를 누르면 저장하고 상세로 돌아가 알린다', async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole('radio', { name: /전체 공개/ }));
    await user.click(screen.getByRole('button', { name: '수정하기' }));

    expect(bundleEdits.read().memberOnly.get('bundle-1')).toBe(false);
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
    expect(toast).toHaveBeenCalledWith('번들을 수정했어요', expect.anything());
  });

  it('비공개 번치면 「전체 공개」 대신 「일부 공개」다', () => {
    renderScreen('bundle-1', true);

    expect(screen.getByRole('radio', { name: /일부 공개/ })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /전체 공개/ })).toBeNull();
  });

  it('메인 관리자가 아닌 번들, 지운 번들, 없는 번들로 직접 들어오면 볼 수 없다는 안내다', () => {
    renderScreen('bundle-2');
    expect(
      screen.getByRole('heading', { name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('지운 번들로 들어와도 안내다', () => {
    bundleEdits.remove('bundle-1');
    renderScreen();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});
