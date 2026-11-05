import type * as DesignSystem from '@app/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { createBundle } from '../../api/bundles';
import { BUNDLE_MESSAGES } from '../../constants/messages';
import { DraftProvider } from '../../contexts/DraftProvider';
import { BundleDraftPhotoCaption } from './BundleDraftPhotoCaption';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const back = vi.fn();
const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ back, replace, push }) }));
vi.mock('@/shared/lib/lottieLight', () => ({ LottieLight: () => null }));

const WAIT = { timeout: 8000 };
const { P1, P2, P3, P4 } = MOCK_PHOTO_IDS;

const serverPhotos = (draftId: string) =>
  mockDb.get().bundles.find((bundle) => String(bundle.id) === draftId)?.photos ?? [];

// 사진 상세 캡션 화면을 실제 초안 상태(가짜 서버)와 함께 띄움: 사진 빼기가 서버에 반영되는지 확인하는 흐름
const renderCaptionScreen = async (targetSourcePhotoId: number) => {
  const created = await createBundle(
    String(MOCK_BUNCH_ID),
    [P1, P2, P3, P4].map(String),
    createIdempotencyKey(),
  );
  const target = created.photos.find(
    (photo) => photo.sourcePhotoId === String(targetSourcePhotoId),
  )!;
  render(
    <DraftProvider draftId={created.id}>
      <BundleDraftPhotoCaption photoId={target.id} />
    </DraftProvider>,
    { wrapper: createQueryWrapper(createTestQueryClient()) },
  );
  return created.id;
};

beforeEach(() => {
  vi.clearAllMocks();
  // 사진 주소 동기화가 남긴 이전 테스트의 주소가 다음 화면의 첫 사진을 바꾸지 않게 초기화
  window.history.replaceState(null, '', '/');
});

describe('UT 상태 B 사진 상세 화면(사진 빼기)', () => {
  it('캡션이 없는 3번 사진은 바로 빼지고 서버 구성도 바뀐다', async () => {
    const id = await renderCaptionScreen(P3);

    await userEvent.click(await screen.findByRole('button', { name: '3번째 사진 빼기' }, WAIT));

    await waitFor(() => expect(serverPhotos(id)).toHaveLength(3), WAIT);
    expect(serverPhotos(id).map((photo) => photo.photoId)).toEqual([P1, P2, P4]);
  }, 15_000);

  it('경진이 편집 중인 2번 사진은 빼지지 않고 편집 제한 안내가 뜬다', async () => {
    const id = await renderCaptionScreen(P2);

    await userEvent.click(await screen.findByRole('button', { name: /경진님이 편집 중/ }, WAIT));

    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.editingBlocked, expect.anything());
    expect(serverPhotos(id)).toHaveLength(4);
  }, 15_000);
});
