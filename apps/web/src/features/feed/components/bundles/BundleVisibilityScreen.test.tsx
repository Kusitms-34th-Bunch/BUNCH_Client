import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bundleEdits } from '../../lib/bundleEdits';
import { bundleDetailKeys } from '../../queries/bundleDetail';
import { BundleVisibilityScreen } from './BundleVisibilityScreen';

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

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

// 상세 응답(명세 084)의 공개 범위와 수정 권한만 화면이 읽음. 1은 수정 권한이 있는 멤버 공개 번들, 2는 권한 없음
const detail = (id: number, canEdit: boolean) => ({
  id,
  bunchId: 1,
  title: '제주 3박4일 여행 아카이빙',
  photos: [],
  contributors: [],
  comments: [],
  locations: [],
  visibility: 'PRIVATE' as const,
  permissions: { canEdit, canDelete: canEdit, canReport: !canEdit },
  likeCount: 0,
  likedByCurrentBunch: false,
  commentCount: 0,
});

const renderScreen = (bundleId = '1', bunchPrivate = false) => {
  const client = createTestQueryClient();
  client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
  client.setQueryData(
    bundleDetailKeys.detail('1', bundleId, '1'),
    detail(Number(bundleId), bundleId === '1'),
  );
  render(<BundleVisibilityScreen bunchId="1" bundleId={bundleId} bunchPrivate={bunchPrivate} />, {
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

    expect(bundleEdits.read().memberOnly.get('1')).toBe(false);
    expect(back.mock.calls.length + replace.mock.calls.length).toBe(1);
    expect(toastAfterNavigation).toHaveBeenCalledWith('번들을 수정했어요');
  });

  it('비공개 번치면 「전체 공개」 대신 「일부 공개」다', () => {
    renderScreen('1', true);

    expect(screen.getByRole('radio', { name: /일부 공개/ })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /전체 공개/ })).toBeNull();
  });

  it('수정 권한이 없는 번들로 직접 들어오면 볼 수 없다는 안내다', () => {
    renderScreen('2');
    expect(
      screen.getByRole('heading', { name: '삭제되었거나 볼 수 없는 내용이에요' }),
    ).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('지운 번들로 들어와도 안내다', () => {
    bundleEdits.remove('1');
    renderScreen();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('상세를 받지 못하면(일시 오류) 안내와 다시 시도를 보인다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/published-bundles/:bundleId', () => fail(500, 'COMMON_999')),
    );
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { memberId: 'me', bunch: { id: '1', name: '여행가조' } });
    render(<BundleVisibilityScreen bunchId="1" bundleId="9" bunchPrivate={false} />, {
      wrapper: createQueryWrapper(client),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('일시적인 오류가 발생했어요');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  });
});
