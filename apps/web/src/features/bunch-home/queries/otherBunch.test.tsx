import type * as DesignSystem from '@app/design-system';
import { act, renderHook } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_EXTERNAL_BUNCH_IDS } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { bunchHomeKeys } from './keys';
import { useFollowBunchMutation } from './otherBunch';

// 내 번치(여행쥬아)가 다른 번치 3·4를 팔로우한 관계(시작 데이터의 목록용 관계는 제외)
const myExternalFollows = () =>
  mockDb
    .get()
    .follows.filter(
      (follow) =>
        follow.followerBunchId === MOCK_BUNCH_ID &&
        (follow.targetBunchId === 3 || follow.targetBunchId === 4),
    );

type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const viewer = String(MOCK_BUNCH_ID);
// 내 번치가 공개 번치를 이미 팔로우한 상태
const followed = () =>
  mockDb.update((state) => ({
    ...state,
    follows: [
      {
        id: 1,
        followerBunchId: MOCK_BUNCH_ID,
        targetBunchId: MOCK_EXTERNAL_BUNCH_IDS.public,
        status: 'FOLLOWING',
        createdAt: '2026-10-01T09:00:00.000Z',
      },
    ],
  }));
const target = String(MOCK_EXTERNAL_BUNCH_IDS.public);
const setup = () => {
  const client = createTestQueryClient();
  // 무효화를 확인할 내 번치 홈·다른 번치 홈(관찰자가 없어 다시 받지 않고 표시만 바뀜)
  client.setQueryData(sharedKeys.bunchHome(viewer), {});
  client.setQueryData(bunchHomeKeys.otherBunchHome(target, viewer), { followState: 'NONE' });
  const { result } = renderHook(() => useFollowBunchMutation(viewer), {
    wrapper: createQueryWrapper(client),
  });
  return { client, result };
};

describe('useFollowBunchMutation', () => {
  it('팔로우하면 상태를 바로 반영하고 그 번치와 내 번치 홈(팔로잉 수)을 무효화한다', async () => {
    const { client, result } = setup();

    await act(() => result.current.mutateAsync({ targetId: target, change: { kind: 'follow' } }));

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
      act(() =>
        result.current.mutateAsync({
          targetId: target,
          change: { kind: 'unfollow', followId: '1' },
        }),
      ),
    ).resolves.toBe('NONE');
    expect(toast).not.toHaveBeenCalled();
  });

  it('관계가 남아 있는데 404면(오래된 ID) 성공으로 보지 않고 안내한다', async () => {
    followed();
    server.use(
      http.delete('/api/bunches/:viewerId/following/:targetId', () => fail(404, 'RESOURCE_001')),
    );
    const { result } = setup();

    await expect(
      act(() =>
        result.current.mutateAsync({
          targetId: target,
          change: { kind: 'unfollow', followId: '1' },
        }),
      ),
    ).rejects.toThrow();
    expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.followFailed);
  });

  it('관계 ID 없이 취소하면 팔로우 요청으로 같은 관계의 ID를 얻어 해제한다', async () => {
    followed();
    const { result } = setup();

    await act(() =>
      result.current.mutateAsync({
        targetId: target,
        change: { kind: 'unfollow', followId: undefined },
      }),
    );

    expect(myExternalFollows()).toEqual([]);
    expect(toast).not.toHaveBeenCalled();
  });
});
