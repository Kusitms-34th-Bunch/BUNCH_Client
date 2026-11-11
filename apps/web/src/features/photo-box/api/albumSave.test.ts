import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { saveToAlbum } from './albumSave';

const bridge = vi.hoisted(() => ({
  native: true,
  methodAvailable: true,
  saveImagesToAlbum: vi.fn(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => bridge.native,
  photoUploadBridge: {
    isNativeMethodAvailable: () => bridge.methodAvailable,
    saveImagesToAlbum: bridge.saveImagesToAlbum,
  },
}));

const bunchId = String(MOCK_BUNCH_ID);

// 사진 id마다 원본 주소를 돌려주고, missing에 든 id는 없는 사진으로 응답
const serveDetails = (missing: readonly string[] = []) => {
  server.use(
    http.get('/api/bunches/:bunchId/photos/:photoId', ({ params }) => {
      const photoId = String(params.photoId);
      if (missing.includes(photoId)) return fail(404, 'RESOURCE_001');
      return ok({
        photoId: Number(photoId),
        imageUrl: `https://cdn.example.com/original/${photoId}.jpg`,
        uploaders: [],
      });
    }),
  );
};

beforeEach(() => {
  bridge.native = true;
  bridge.methodAvailable = true;
  bridge.saveImagesToAlbum.mockReset();
});

describe('saveToAlbum', () => {
  it('사진마다 원본 주소를 받아 선택 순서대로 쉘에 넘기고 사진별 결과를 돌려준다', async () => {
    serveDetails();
    bridge.saveImagesToAlbum.mockResolvedValue({ status: 'saved', results: [true, false, true] });

    const result = await saveToAlbum(bunchId, ['3', '1', '2']);

    expect(bridge.saveImagesToAlbum).toHaveBeenCalledWith([
      'https://cdn.example.com/original/3.jpg',
      'https://cdn.example.com/original/1.jpg',
      'https://cdn.example.com/original/2.jpg',
    ]);
    expect(result).toEqual({ savedIds: ['3', '2'], failedIds: ['1'] });
  });

  it('원본 주소를 받지 못한 사진은 쉘에 넘기지 않고 저장하지 못한 사진으로 센다', async () => {
    serveDetails(['2']);
    bridge.saveImagesToAlbum.mockResolvedValue({ status: 'saved', results: [true, true] });

    const result = await saveToAlbum(bunchId, ['1', '2', '3']);

    expect(bridge.saveImagesToAlbum).toHaveBeenCalledWith([
      'https://cdn.example.com/original/1.jpg',
      'https://cdn.example.com/original/3.jpg',
    ]);
    expect(result).toEqual({ savedIds: ['1', '3'], failedIds: ['2'] });
  });

  it('모든 사진의 원본 주소를 받지 못하면 쉘을 부르지 않고 모두 실패로 돌려준다', async () => {
    serveDetails(['1', '2']);

    const result = await saveToAlbum(bunchId, ['1', '2']);

    expect(bridge.saveImagesToAlbum).not.toHaveBeenCalled();
    expect(result).toEqual({ savedIds: [], failedIds: ['1', '2'] });
  });

  it('저장 권한이 거부되어 있으면 모두 실패로 돌려주고 이유를 denied로 알린다', async () => {
    serveDetails();
    bridge.saveImagesToAlbum.mockResolvedValue({ status: 'denied' });

    const result = await saveToAlbum(bunchId, ['1', '2']);

    expect(result).toEqual({ savedIds: [], failedIds: ['1', '2'], blocked: 'denied' });
  });

  it('쉘이 없는 브라우저에서는 요청 없이 unavailable로 돌려준다', async () => {
    bridge.native = false;

    const result = await saveToAlbum(bunchId, ['1']);

    expect(result).toEqual({ savedIds: [], failedIds: ['1'], blocked: 'unavailable' });
    expect(bridge.saveImagesToAlbum).not.toHaveBeenCalled();
  });

  it('저장 기능이 없는 이전 쉘이면 outdated로 돌려준다', async () => {
    bridge.methodAvailable = false;

    const result = await saveToAlbum(bunchId, ['1']);

    expect(result).toEqual({ savedIds: [], failedIds: ['1'], blocked: 'outdated' });
  });

  it('https가 아닌 주소(같은 출처 경로의 목 서버 주소 등)는 쉘에 넘기지 않고 저장하지 못한 사진으로 센다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos/:photoId', ({ params }) => {
        const photoId = String(params.photoId);
        return ok({
          photoId: Number(photoId),
          imageUrl:
            photoId === '2' ? '/mock/photos/2.jpg' : `https://cdn.example.com/${photoId}.jpg`,
          uploaders: [],
        });
      }),
    );
    bridge.saveImagesToAlbum.mockResolvedValue({ status: 'saved', results: [true, true] });

    const result = await saveToAlbum(bunchId, ['1', '2', '3']);

    // 주소 하나 때문에 묶음 전체가 거절되지 않고 나머지는 저장함
    expect(bridge.saveImagesToAlbum).toHaveBeenCalledWith([
      'https://cdn.example.com/1.jpg',
      'https://cdn.example.com/3.jpg',
    ]);
    expect(result).toEqual({ savedIds: ['1', '3'], failedIds: ['2'] });
  });

  it('IP 주소·계정 정보·localhost 주소는 쉘에 넘기지 않는다', async () => {
    const urls: Record<string, string> = {
      '1': 'https://192.168.0.1/a.jpg',
      '2': 'https://user:pass@cdn.example.com/a.jpg',
      '3': 'https://localhost/a.jpg',
    };
    server.use(
      http.get('/api/bunches/:bunchId/photos/:photoId', ({ params }) =>
        ok({
          photoId: Number(params.photoId),
          imageUrl: urls[String(params.photoId)],
          uploaders: [],
        }),
      ),
    );

    const result = await saveToAlbum(bunchId, ['1', '2', '3']);

    expect(bridge.saveImagesToAlbum).not.toHaveBeenCalled();
    expect(result).toEqual({ savedIds: [], failedIds: ['1', '2', '3'] });
  });

  it('쉘 결과 길이가 요청과 다르면 모두 저장하지 못한 것으로 본다', async () => {
    serveDetails();
    bridge.saveImagesToAlbum.mockResolvedValue({ status: 'saved', results: [true] });

    const result = await saveToAlbum(bunchId, ['1', '2']);

    expect(result).toEqual({ savedIds: [], failedIds: ['1', '2'] });
  });
});
