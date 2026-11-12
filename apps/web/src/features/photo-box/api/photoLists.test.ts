import { INVALID_RESPONSE_CODE } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getDatedPhotosPage, getUndatedPhotosPage } from './photos';

const bunchId = String(MOCK_BUNCH_ID);

// 날짜를 모르는 사진을 만들기 위해 시작 데이터의 사진 두 장에서 날짜를 지움
const clearDates = (...photoIds: number[]) =>
  mockDb.update((current) => ({
    ...current,
    photos: current.photos.map((photo) =>
      photoIds.includes(photo.photoId)
        ? { ...photo, capturedDate: null, capturedTime: null }
        : photo,
    ),
  }));

describe('getDatedPhotosPage', () => {
  it('날짜를 아는 사진을 최신 촬영 순으로 화면 모양으로 돌려준다', async () => {
    const page = await getDatedPhotosPage({ bunchId });

    expect(page.totalCount).toBe(13);
    expect(page.nextCursor).toBeNull();
    // 10월 18일(최신) 18:30 S6가 맨 앞, 10월 3일 O1이 맨 뒤
    expect(page.photos[0]).toMatchObject({
      id: String(MOCK_PHOTO_IDS.S6),
      takenAt: '2026-10-18T18:30',
      uploaderIds: [String(MOCK_MEMBER_IDS.memberC)],
      status: 'ready',
    });
    expect(page.photos.at(-1)?.id).toBe(String(MOCK_PHOTO_IDS.O1));
  });

  it('올린 사람으로 거르면 그 사람이 올린 사진만 최신순으로 온다', async () => {
    const page = await getDatedPhotosPage({ bunchId, memberId: String(MOCK_MEMBER_IDS.memberA) });

    expect(page.photos.map((photo) => photo.id)).toEqual(
      [MOCK_PHOTO_IDS.S5, MOCK_PHOTO_IDS.S2, MOCK_PHOTO_IDS.P1, MOCK_PHOTO_IDS.O3].map(String),
    );
  });

  it('size보다 사진이 많으면 nextCursor로 다음 쪽을 이어 받는다', async () => {
    const response = await fetch(`/api/bunches/${bunchId}/photos?size=5`);
    const first = (await response.json()) as {
      data: { photos: unknown[]; nextCursor: string; totalCount: number };
    };
    expect(first.data.photos).toHaveLength(5);
    expect(first.data.totalCount).toBe(13);

    const next = await getDatedPhotosPage({ bunchId, cursor: first.data.nextCursor });
    expect(next.photos).toHaveLength(8);
    expect(next.nextCursor).toBeNull();
  });

  it('한 번에 서버가 허용하는 최대 100장씩 요청한다(1,000장 상한을 10번에 받음)', async () => {
    const sizes: (string | null)[] = [];
    server.use(
      http.get('/api/bunches/:bunchId/photos', ({ request }) => {
        sizes.push(new URL(request.url).searchParams.get('size'));
        // 기본 가짜 서버 handler가 이어서 응답
        return undefined;
      }),
      http.get('/api/bunches/:bunchId/photos/undated', ({ request }) => {
        sizes.push(new URL(request.url).searchParams.get('size'));
        return undefined;
      }),
    );

    await getDatedPhotosPage({ bunchId });
    await getUndatedPhotosPage({ bunchId });

    expect(sizes).toEqual(['100', '100']);
  });

  it('nextCursor가 빈 문자열이면 마지막 쪽으로 본다(보내지 않으면 첫 쪽을 다시 받게 됨)', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos', () =>
        ok({ totalCount: 0, photos: [], nextCursor: '' }),
      ),
    );

    const page = await getDatedPhotosPage({ bunchId });

    expect(page.nextCursor).toBeNull();
  });

  it('시각이 객체(LocalTime)로 와도 같은 시각으로 바꾼다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos', () =>
        ok({
          totalCount: 1,
          photos: [
            {
              photoId: 7,
              thumbnailUrl: 'a.jpg',
              capturedDate: '2026-10-18',
              capturedTime: { hour: 9, minute: 5, second: 0, nano: 0 },
              uploaderIds: [1],
            },
          ],
        }),
      ),
    );

    const page = await getDatedPhotosPage({ bunchId });
    expect(page.photos[0]?.takenAt).toBe('2026-10-18T09:05');
  });

  it('범위를 벗어난 시각 문자열은 성공으로 넘기지 않는다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos', () =>
        ok({
          totalCount: 1,
          photos: [
            {
              photoId: 7,
              thumbnailUrl: 'a.jpg',
              capturedDate: '2026-10-18',
              capturedTime: '29:99',
              uploaderIds: [1],
            },
          ],
        }),
      ),
    );

    await expect(getDatedPhotosPage({ bunchId })).rejects.toMatchObject({
      code: INVALID_RESPONSE_CODE,
    });
  });

  it('Date 범위를 넘는 큰 사진 id가 있어도 목록 전체가 실패하지 않는다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos', () =>
        ok({
          totalCount: 1,
          photos: [
            {
              photoId: 9_000_000_000_000_000,
              thumbnailUrl: 'a.jpg',
              capturedDate: '2026-10-18',
              uploaderIds: [1],
            },
          ],
        }),
      ),
    );

    const page = await getDatedPhotosPage({ bunchId });
    expect(page.photos).toHaveLength(1);
  });

  it('시각이 없으면 자정으로 둔다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos', () =>
        ok({
          totalCount: 1,
          photos: [
            { photoId: 7, thumbnailUrl: 'a.jpg', capturedDate: '2026-10-18', uploaderIds: [1] },
          ],
        }),
      ),
    );

    const page = await getDatedPhotosPage({ bunchId });
    expect(page.photos[0]?.takenAt).toBe('2026-10-18T00:00');
  });

  it.each([
    ['숫자가 아닌 번치', 'abc', 400, 'COMMON_001'],
    ['없는 번치', '999', 404, 'RESOURCE_001'],
  ] as const)('%s는 %i %s 오류다', async (_name, id, status, code) => {
    await expect(getDatedPhotosPage({ bunchId: id })).rejects.toMatchObject({ status, code });
  });

  it('내가 소속이 아니면 AUTH_002(403)이다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    await expect(getDatedPhotosPage({ bunchId })).rejects.toMatchObject({
      status: 403,
      code: 'AUTH_002',
    });
  });

  it('번치 멤버가 아닌 사람으로 거르면 COMMON_001(400)이다', async () => {
    await expect(getDatedPhotosPage({ bunchId, memberId: '999' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('응답이 계약과 다르면 성공으로 넘기지 않는다', async () => {
    server.use(http.get('/api/bunches/:bunchId/photos', () => ok({ totalCount: '1', photos: [] })));
    await expect(getDatedPhotosPage({ bunchId })).rejects.toMatchObject({
      code: INVALID_RESPONSE_CODE,
    });
  });

  it('서버 오류는 ApiError로 전달한다', async () => {
    server.use(http.get('/api/bunches/:bunchId/photos', () => fail(500, 'COMMON_500')));
    await expect(getDatedPhotosPage({ bunchId })).rejects.toMatchObject({
      status: 500,
      code: 'COMMON_500',
    });
  });
});

describe('getUndatedPhotosPage', () => {
  it('시작 데이터에는 날짜를 모르는 사진이 없다', async () => {
    await expect(getUndatedPhotosPage({ bunchId })).resolves.toEqual({
      totalCount: 0,
      photos: [],
      nextCursor: null,
    });
  });

  it('날짜가 없는 사진만 날짜 미확인으로 돌려주고 날짜 목록에서는 빠진다', async () => {
    clearDates(MOCK_PHOTO_IDS.S1, MOCK_PHOTO_IDS.O2);

    const undated = await getUndatedPhotosPage({ bunchId });
    expect(undated.totalCount).toBe(2);
    // 날짜를 모르는 사진은 업로드 최신순(id 큰 것이 앞)
    expect(undated.photos.map((photo) => photo.id)).toEqual([
      String(MOCK_PHOTO_IDS.O2),
      String(MOCK_PHOTO_IDS.S1),
    ]);
    expect(undated.photos.every((photo) => photo.takenAt === null)).toBe(true);

    const dated = await getDatedPhotosPage({ bunchId });
    expect(dated.totalCount).toBe(11);
  });
});
