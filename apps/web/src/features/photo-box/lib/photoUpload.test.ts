import { ApiError } from '@app/api-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createUploadBatchId,
  isRetryableUploadError,
  isUploadableJpeg,
  isUploadLimitError,
  MAX_UPLOAD_BYTES,
  runPool,
  summarizeUpload,
  uploadResultMessage,
} from './photoUpload';

describe('isRetryableUploadError', () => {
  it('네트워크 실패와 이미지 저장소 일시 장애(PHOTO_007)만 다시 시도할 수 있다', () => {
    expect(isRetryableUploadError(new ApiError({ message: 'x', category: 'network' }))).toBe(true);
    expect(
      isRetryableUploadError(
        new ApiError({ message: 'x', category: 'server', status: 503, code: 'PHOTO_007' }),
      ),
    ).toBe(true);
  });

  it('BFF가 백엔드에 닿지 못한 오류와 코드 없는 게이트웨이 오류(502·504)도 다시 시도할 수 있다', () => {
    const bff = new ApiError({
      message: 'x',
      category: 'server',
      status: 502,
      code: 'BFF_UPSTREAM_UNAVAILABLE',
    });
    expect(isRetryableUploadError(bff)).toBe(true);
    for (const status of [502, 504]) {
      expect(
        isRetryableUploadError(new ApiError({ message: 'x', category: 'server', status })),
      ).toBe(true);
    }
    // 코드 없는 413(본문 4.5MB 초과)과 500은 다시 보내도 같은 결과
    expect(
      isRetryableUploadError(new ApiError({ message: 'x', category: 'validation', status: 413 })),
    ).toBe(false);
    expect(
      isRetryableUploadError(new ApiError({ message: 'x', category: 'server', status: 500 })),
    ).toBe(false);
  });

  it('형식·용량·한도·권한 오류와 그 밖의 서버 오류는 다시 보내도 같은 결과라 대상이 아니다', () => {
    const rejected = [
      { category: 'validation', status: 400, code: 'COMMON_001' },
      { category: 'auth', status: 403, code: 'AUTH_002' },
      { category: 'validation', status: 409, code: 'PHOTO_001' },
      { category: 'validation', status: 409, code: 'PHOTO_002' },
      { category: 'validation', status: 409, code: 'PHOTO_003' },
      { category: 'validation', status: 404, code: 'RESOURCE_001' },
      { category: 'server', status: 500, code: 'COMMON_500' },
    ] as const;
    for (const options of rejected) {
      expect(isRetryableUploadError(new ApiError({ message: 'x', ...options })), options.code).toBe(
        false,
      );
    }
  });

  it('ApiError가 아닌 오류는 대상이 아니다', () => {
    expect(isRetryableUploadError(new Error('boom'))).toBe(false);
    expect(isRetryableUploadError(undefined)).toBe(false);
  });
});

describe('summarizeUpload', () => {
  it('들어간 사진과 올리지 못한 사진, 그중 다시 시도 대상을 센다', () => {
    expect(
      summarizeUpload(['added', 'failed', 'failed-retryable', 'added', 'failed-retryable']),
    ).toEqual({ added: 2, failed: 3, retryable: 2 });
    expect(summarizeUpload([])).toEqual({ added: 0, failed: 0, retryable: 0 });
  });

  it('내가 이미 올려 제외된 사진(skipped)은 추가한 사진에도 올리지 못한 사진에도 세지 않는다', () => {
    expect(summarizeUpload(['added', 'skipped', 'skipped', 'failed'])).toEqual({
      added: 1,
      failed: 1,
      retryable: 0,
    });
    expect(summarizeUpload(['skipped', 'skipped'])).toEqual({ added: 0, failed: 0, retryable: 0 });
  });
});

describe('uploadResultMessage', () => {
  it('추가한 사진도 올리지 못한 사진도 없으면(모두 제외됨) 알릴 것이 없다', () => {
    expect(uploadResultMessage({ added: 0, failed: 0, retryable: 0 })).toBeNull();
  });

  it('전부 올라가면 추가한 장수를 알린다', () => {
    expect(uploadResultMessage({ added: 7, failed: 0, retryable: 0 })).toBe(
      '7장의 사진을 사진함에 추가했어요.',
    );
  });

  it('일부만 올라가면 추가한 장수와 올리지 못한 장수를 함께 알린다', () => {
    expect(uploadResultMessage({ added: 7, failed: 3, retryable: 1 })).toBe(
      '7장을 추가했어요. 3장은 올리지 못했어요.',
    );
  });

  it('하나도 못 올렸으면 장수 없이 알린다', () => {
    expect(uploadResultMessage({ added: 0, failed: 5, retryable: 5 })).toBe(
      '사진을 올리지 못했어요.',
    );
  });
});

describe('runPool', () => {
  it('동시에 처리하는 수를 제한하고 결과를 항목 순서대로 돌려준다', async () => {
    let running = 0;
    let peak = 0;
    const results = await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
      running += 1;
      peak = Math.max(peak, running);
      // 앞 항목일수록 늦게 끝나게 해서 순서가 완료 순이 아니라 항목 순인지 확인
      await new Promise((resolve) => setTimeout(resolve, (8 - item) * 3));
      running -= 1;
      return item * 10;
    });

    expect(peak).toBe(3);
    expect(results).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  it('항목보다 한도가 커도, 항목이 없어도 문제없다', async () => {
    expect(await runPool([1, 2], 10, (item) => Promise.resolve(item + 1))).toEqual([2, 3]);
    expect(await runPool([], 3, (item: number) => Promise.resolve(item))).toEqual([]);
  });

  it('모든 항목을 한 번씩만 처리한다', async () => {
    const seen: number[] = [];
    await runPool([1, 2, 3, 4, 5], 2, (item) => {
      seen.push(item);
      return Promise.resolve();
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('createUploadBatchId', () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  afterEach(() => vi.unstubAllGlobals());

  it('UUID v4를 만든다', () => {
    expect(createUploadBatchId()).toMatch(UUID_V4);
  });

  it('crypto.randomUUID가 없는 환경(http 주소)에서도 UUID v4를 만들고 매번 다르다', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const first = createUploadBatchId();
    const second = createUploadBatchId();

    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(first).not.toBe(second);
  });
});

describe('isUploadLimitError', () => {
  it('하루 한도(PHOTO_002)와 한 번에 올릴 수 있는 수(PHOTO_003)만 남은 사진을 멈추는 한도 오류다', () => {
    const limit = (code: string) =>
      new ApiError({ message: 'x', category: 'validation', status: 409, code });
    expect(isUploadLimitError(limit('PHOTO_002'))).toBe(true);
    expect(isUploadLimitError(limit('PHOTO_003'))).toBe(true);
    // 1,000장(PHOTO_001)은 같은 사진 합치기가 허용될 수 있어 남은 사진을 계속 보냄
    expect(isUploadLimitError(limit('PHOTO_001'))).toBe(false);
    expect(isUploadLimitError(limit('COMMON_001'))).toBe(false);
    expect(isUploadLimitError(new Error('boom'))).toBe(false);
  });
});

describe('isUploadableJpeg', () => {
  const jpegBytes = (size: number) => {
    const bytes = new Uint8Array(size);
    bytes.set([0xff, 0xd8, 0xff]);
    return new Blob([bytes], { type: 'image/jpeg' });
  };

  it('JPEG 시작 바이트로 시작하고 크기 상한 이하면 보낼 수 있다', async () => {
    expect(await isUploadableJpeg(jpegBytes(1024))).toBe(true);
    expect(await isUploadableJpeg(jpegBytes(MAX_UPLOAD_BYTES))).toBe(true);
  });

  it('비어 있거나 상한을 넘거나 JPEG로 시작하지 않으면 보내지 않는다', async () => {
    expect(await isUploadableJpeg(new Blob([]))).toBe(false);
    expect(await isUploadableJpeg(jpegBytes(MAX_UPLOAD_BYTES + 1))).toBe(false);
    // MIME이 image/jpeg여도 바이트가 JPEG가 아니면 거절
    expect(await isUploadableJpeg(new Blob(['not-a-jpeg'], { type: 'image/jpeg' }))).toBe(false);
    expect(await isUploadableJpeg(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]))).toBe(
      false,
    );
  });

  it('상한은 Vercel 함수 본문 한도(약 4.5MB)보다 작다', () => {
    expect(MAX_UPLOAD_BYTES).toBeLessThan(4.5 * 1000 * 1000);
  });
});
