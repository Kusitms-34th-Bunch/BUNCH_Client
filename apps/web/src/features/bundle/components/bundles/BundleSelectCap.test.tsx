import type * as DesignSystem from '@app/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhotoBoxPhoto, PhotoBoxState } from '@/features/photo-box/lib/types';
import { BUNDLE_SELECT_MESSAGES } from '../../constants/selectMessages';
import { BundleSelectProvider } from '../../contexts/BundleSelectProvider';
import { BundleSelect } from './BundleSelect';

const router = { push: vi.fn(), back: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
// 30장짜리 사진 상태로 20장 상한을 확인
vi.mock('@/features/photo-box/hooks/usePhotoBox', () => ({
  usePhotoBox: () => ({ state, actions: {} }),
}));
vi.mock('../../hooks/useCreateBundle', async () => ({
  useCreateBundle: (await import('../../testing/selectScreenDoubles')).useCreateBundleDouble,
}));
vi.mock('../../fixtures/recommendation.fixture', async () => ({
  recommendationFixture: (await import('../../testing/selectScreenDoubles'))
    .legacyRecommendationFixture,
}));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => <span data-testid="lottie" /> }));

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

// 사진 21장(모두 같은 날): 한도(20장)를 넘기는 경우만 보려고 사진함 hook을 대신함
const photos: PhotoBoxPhoto[] = Array.from({ length: 21 }, (_, index) => ({
  id: `cap-${index + 1}`,
  src: `/cap-${index + 1}.jpg`,
  alt: `사진 ${index + 1}`,
  takenAt: `2026-09-27T10:${String(index).padStart(2, '0')}`,
  uploadedAt: '2026-10-01T00:00:00',
  uploaderIds: ['a'],
  status: 'ready',
}));
const state: PhotoBoxState = {
  kind: 'ready',
  data: {
    bunch: { id: 'b', name: '번치' },
    viewer: { memberId: 'a', isAdmin: false },
    members: [{ id: 'a', name: '은우' }],
    photos,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('번들 사진 20장 한도', () => {
  it('21번째 사진은 선택되지 않고 안내 토스트가 뜬다', async () => {
    render(
      <BundleSelectProvider initialMemberIds={['b']}>
        <BundleSelect currentYear={2026} />
      </BundleSelectProvider>,
    );

    const cells = within(screen.getByRole('region', { name: '9월 27일 일요일' })).getAllByRole(
      'button',
    );
    for (const cell of cells) await userEvent.click(cell);

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(BUNDLE_SELECT_MESSAGES.maxPhotos, { fullWidth: true });
    expect(screen.getByRole('status')).toHaveTextContent('20장 선택됨');
  });
});
