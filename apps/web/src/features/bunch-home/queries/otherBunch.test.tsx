import type * as DesignSystem from '@app/design-system';
import { act, renderHook } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { MOCK_BUNCH_ID, MOCK_EXTERNAL_BUNCH_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { bunchHomeKeys } from './keys';
import { useFollowBunchMutation } from './otherBunch';

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const viewer = String(MOCK_BUNCH_ID);
const target = String(MOCK_EXTERNAL_BUNCH_IDS.public);
const setup = () => {
  const client = createTestQueryClient();
  // 무효화를 확인할 내 번치 홈·다른 번치 홈(관찰자가 없어 다시 받지 않고 표시만 바뀜)
  client.setQueryData(sharedKeys.bunchHome(viewer), {});
  client.setQueryData(bunchHomeKeys.otherBunchHome(target, viewer), { followState: 'NONE' });
  const { result } = renderHook(() => useFollowBunchMutation(target, viewer), {
    wrapper: createQueryWrapper(client),
  });
  return { client, result };
};

describe('useFollowBunchMutation', () => {
  it('팔로우하면 상태를 바로 반영하고 그 번치와 내 번치 홈(팔로잉 수)을 무효화한다', async () => {
    const { client, result } = setup();

    await act(() => result.current.mutateAsync({ kind: 'follow' }));

    expect(client.getQueryData(bunchHomeKeys.otherBunchHome(target, viewer))).toMatchObject({
      followState: 'FOLLOWING',
    });
    expect(client.getQueryState(sharedKeys.bunchHome(viewer))?.isInvalidated).toBe(true);
    expect(client.getQueryState(bunchHomeKeys.otherBunchHome(target, viewer))?.isInvalidated).toBe(
      true,
    );
  });

  it('이미 해제된 관계(404) 취소는 성공으로 본다', async () => {
    server.use(
      http.delete('/api/bunches/:viewerId/following/:targetId', () => fail(404, 'RESOURCE_001')),
    );
    const { result } = setup();

    await expect(
      act(() => result.current.mutateAsync({ kind: 'unfollow', followId: '1' })),
    ).resolves.toBe('NONE');
    expect(toast).not.toHaveBeenCalled();
  });

  it('관계 ID 없이 취소하면 처리하지 못했다고 안내하고 그 번치를 다시 받게 한다', async () => {
    const { client, result } = setup();

    await expect(
      act(() => result.current.mutateAsync({ kind: 'unfollow', followId: undefined })),
    ).rejects.toThrow();
    expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.followFailed);
    expect(client.getQueryState(bunchHomeKeys.otherBunchHome(target, viewer))?.isInvalidated).toBe(
      true,
    );
  });
});
