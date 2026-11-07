import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_MEMBER_IDS } from '@/mocks/db/seed';
import { getMyProfile } from './myProfile';

const bunchId = '1';

describe('getMyProfile', () => {
  it('시연하는 사람의 id와 기본 번치를 화면 모양으로 돌려준다(대표 이미지가 없으면 성격별 기본 이미지)', async () => {
    await expect(getMyProfile()).resolves.toEqual({
      memberId: String(MOCK_MEMBER_IDS.me),
      bunch: { id: bunchId, name: '여행쥬아', imageSrc: '/images/default-bunch/type-1.svg' },
    });
  });

  it('기본 번치가 없으면 bunch는 null이다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    await expect(getMyProfile()).resolves.toMatchObject({ bunch: null });
  });
});
