import { describe, expect, it } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { mockDb } from '@/mocks/db';
import { MOCK_MEMBER_IDS } from '@/mocks/db/seed';
import { getMyProfile } from './myProfile';

const bunchId = '1';

describe('getMyProfile', () => {
  it('시연하는 사람의 id와 기본 번치를 화면 모양으로 돌려준다(대표 이미지가 없으면 성격별 기본 이미지)', async () => {
    await expect(getMyProfile()).resolves.toEqual({
      memberId: String(MOCK_MEMBER_IDS.me),
      nickname: '큐시즘',
      imageSrc: null,
      bunch: {
        id: bunchId,
        name: '여행쥬아',
        characterType: 'TYPE_1',
        imageSrc: '/images/default-bunch/type-1.svg',
      },
    });
  });

  it.each(['TYPE_2', 'TYPE_3', 'TYPE_4'] as const)(
    '대표 이미지가 없는 %s 번치는 그 성격의 기본 이미지를 쓴다',
    async (type) => {
      mockDb.update((current) => ({
        ...current,
        bunches: current.bunches.map((bunch) => ({ ...bunch, characterType: type })),
      }));

      const profile = await getMyProfile();

      expect(profile.bunch?.imageSrc).toBe(
        `/images/default-bunch/${type.replace('TYPE_', 'type-')}.svg`,
      );
    },
  );

  it('기본 번치가 없으면 bunch는 null이다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    await expect(getMyProfile()).resolves.toMatchObject({ bunch: null });
  });
});
