import { describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_SECOND_BUNCH_ID } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

type Profile = {
  memberId: number;
  nickname: string;
  bunches: { bunch: { id: number }; followState: string; showFollowButton: boolean }[];
};

const get = async (memberId: number | string) => {
  const response = await fetch(`/api/members/${memberId}/social-profile`);
  const body = (await response.json()) as { data: Profile; error: { code: string } | null };
  return { status: response.status, data: body.data, code: body.error?.code };
};

describe('가짜 서버 멤버 프로필', () => {
  it('참여 번치를 지금 번치 기준 팔로우 상태와 함께 주고, 지금 번치 줄에는 버튼이 없다', async () => {
    // 관리자(지예): 내 번치 1과 두 번째 번치 2에 참여
    const { status, data } = await get(MOCK_MEMBER_IDS.admin);
    expect(status).toBe(200);
    expect(data.nickname).toBe('지예');
    const byId = Object.fromEntries(data.bunches.map((item) => [item.bunch.id, item]));
    expect(byId[MOCK_BUNCH_ID]).toMatchObject({ showFollowButton: false });
    expect(byId[MOCK_SECOND_BUNCH_ID]).toMatchObject({
      followState: 'NONE',
      showFollowButton: true,
    });
  });

  it('없는 멤버는 404, 잘못된 ID는 400이다', async () => {
    expect(await get(99999)).toMatchObject({ status: 404, code: 'RESOURCE_001' });
    expect(await get('x')).toMatchObject({ status: 400, code: 'COMMON_001' });
  });

  it('소속 번치가 없으면 모든 줄에 버튼이 없다', async () => {
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) =>
          item.memberId !== MOCK_MEMBER_IDS.me ||
          (item.bunchId !== MOCK_BUNCH_ID && item.bunchId !== MOCK_SECOND_BUNCH_ID),
      ),
    }));
    const { data } = await get(MOCK_MEMBER_IDS.admin);
    expect(data.bunches.every((item) => !item.showFollowButton)).toBe(true);
  });
});
