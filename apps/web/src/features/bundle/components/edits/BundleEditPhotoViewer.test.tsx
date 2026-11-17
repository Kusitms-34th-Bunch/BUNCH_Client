import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID } from '@/mocks/db/seed';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { BundleEditProvider } from '../../contexts/BundleEditProvider';
import { BundleEditPhotoViewer } from './BundleEditPhotoViewer';

// 재생·제스처 라이브러리는 모양과 제스처를 검증하지 않으므로 mock
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: ReactNode }) => <div data-testid="swiper">{children}</div>,
  SwiperSlide: ({ children }: { children: ReactNode }) => <div data-testid="slide">{children}</div>,
}));
vi.mock('swiper/modules', () => ({ A11y: {}, Keyboard: {}, Zoom: {} }));
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/zoom', () => ({}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

const toastAfterNavigation = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/toastAfterNavigation', () => ({ toastAfterNavigation }));

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));

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

const renderViewer = (photoId: string | undefined) =>
  render(
    <BundleEditProvider bunchId={bunchId} bundleId="1">
      <BundleEditPhotoViewer photoId={photoId} />
    </BundleEditProvider>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  setRole('OWNER');
});

describe('BundleEditPhotoViewer', () => {
  it('번들에 있는 사진이면 수정 중인 사진을 크게 보여 준다', async () => {
    const photoId = String(mockDb.get().bundles.find((bundle) => bundle.id === 1)?.photos[0]?.id);
    renderViewer(photoId);

    expect(
      await screen.findByRole('heading', { name: BUNDLE_MESSAGES.photoViewerTitle }),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('주소의 사진이 번들에 없으면 안내 뒤 수정 화면으로 돌아간다', async () => {
    renderViewer('no-such-photo');

    await waitFor(() => expect(replace).toHaveBeenCalledWith(EDIT_PATH));
    expect(toastAfterNavigation).toHaveBeenCalledWith(BUNDLE_MESSAGES.editPhotoMissing);
  });

  it('메인 관리자가 아니면 수정 화면으로 보내 그 화면이 판단하게 한다', async () => {
    setRole('MEMBER');
    renderViewer('1');

    await waitFor(() => expect(replace).toHaveBeenCalledWith(EDIT_PATH));
  });
});
