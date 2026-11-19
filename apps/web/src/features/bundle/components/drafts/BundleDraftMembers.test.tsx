import { render, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { bunchMembersQueryOptions } from '@/shared/query/bunchMembers';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { DraftContext, type DraftContextValue } from '../../contexts/draftContext';
import { draftFixture } from '../../fixtures/draft.fixture';
import { BundleDraftMembers } from './BundleDraftMembers';

vi.mock('@/shared/hooks/useBackOr', () => ({ useBackOr: () => vi.fn() }));
vi.mock('../../hooks/useDraftExit', () => ({ useLeaveDraft: () => vi.fn() }));
// 화면 내용은 DraftMemberManager 테스트가 확인하므로 여기서는 들어올 때의 재조회만 봄
vi.mock('./DraftMemberManager', () => ({ DraftMemberManager: () => null }));

const readyDraft = {
  state: {
    kind: 'ready',
    draft: draftFixture,
    viewer: { memberId: draftFixture.members[0]!.id, bunchRole: 'owner' },
    bunchMembers: [],
  },
  actions: {},
} as unknown as DraftContextValue;

describe('BundleDraftMembers', () => {
  it('들어올 때마다 번치 멤버를 새로 받아, 초안을 연 사이 합류한 멤버도 추가 후보에 나오게 한다', async () => {
    const client = createTestQueryClient();
    const profile = await client.fetchQuery(myProfileQueryOptions());
    // 초안 layout이 방금 받아 둔(아직 신선한) 목록이 있어도 다시 받음
    await client.fetchQuery(bunchMembersQueryOptions(profile.bunch!.id));
    let requests = 0;
    server.use(
      http.get('/api/bunches/:bunchId/members', () => {
        requests += 1;
        return undefined;
      }),
    );

    const Wrapper = createQueryWrapper(client);
    render(
      <Wrapper>
        <DraftContext.Provider value={readyDraft}>
          <BundleDraftMembers />
        </DraftContext.Provider>
      </Wrapper>,
    );

    await waitFor(() => expect(requests).toBe(1));
  });
});
