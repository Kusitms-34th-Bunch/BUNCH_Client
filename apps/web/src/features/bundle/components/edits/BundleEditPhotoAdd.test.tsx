import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BundleEditProvider } from '../../contexts/BundleEditProvider';
import { usePhotoBoxDouble } from '../../testing/selectScreenDoubles';
import { BundleEdit } from './BundleEdit';
import { BundleEditPhotoAdd } from './BundleEditPhotoAdd';

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

const bunchId = String(MOCK_BUNCH_ID);
const EDIT_PATH = `/bunches/${bunchId}/bundles/1/edit`;

const setRole = (role: 'OWNER' | 'MEMBER') =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((membership) =>
      membership.memberId === MOCK_MY_MEMBER_ID && membership.bunchId === MOCK_BUNCH_ID
        ? { ...membership, role }
        : membership,
    ),
  }));

// route가 사진함 상태를 이어 주는 것을 샘플 대역으로 흉내 냄
function PhotoAddHarness() {
  const { state } = usePhotoBoxDouble();
  return (
    <BundleEditPhotoAdd
      photoBox={state.kind === 'ready' ? { kind: 'ready', data: state.data } : { kind: 'loading' }}
    />
  );
}

// 수정 화면과 사진 추가 화면이 같은 provider를 쓰는 것을 한 트리에서 확인(실제로는 route layout이 감쌈)
const renderBoth = () =>
  render(
    <BundleEditProvider bunchId={bunchId} bundleId="1">
      <BundleEdit onImportFromGallery={vi.fn()} />
      <PhotoAddHarness />
    </BundleEditProvider>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  setRole('OWNER');
});

describe('BundleEditPhotoAdd', () => {
  it('사진을 골라 적용하면 서버에는 보내지 않고 수정 화면의 편집 내용에 더한다', async () => {
    renderBoth();
    await screen.findByRole('textbox', { name: /번들 제목/ });
    const saveButton = () => screen.getAllByRole('button', { name: '저장' })[0]!;
    expect(saveButton()).toBeDisabled();

    const region = await screen.findByRole('region', { name: '9월 27일 일요일' });
    await userEvent.click(within(region).getAllByRole('button')[3]!);
    await userEvent.click(screen.getByRole('button', { name: '적용하기' }));

    // 적용하면 이전 화면(수정)으로 돌아가고, 고친 내용은 서버에 반영되지 않은 채 저장 대기
    await waitFor(() => expect(replace.mock.calls.length + back.mock.calls.length).toBe(1));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(mockDb.get().bundles.find((bundle) => bundle.id === 1)?.photos).toHaveLength(1);
  });

  it('메인 관리자가 아니면 수정 화면으로 보내 그 화면이 판단하게 한다', async () => {
    setRole('MEMBER');
    renderBoth();

    await waitFor(() => expect(replace).toHaveBeenCalledWith(EDIT_PATH));
  });
});
