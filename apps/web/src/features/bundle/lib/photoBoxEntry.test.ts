import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearPhotoBoxEntry, readPhotoBoxEntry, startFromPhotoBox } from './photoBoxEntry';

afterEach(() => {
  clearPhotoBoxEntry();
  vi.useRealTimers();
});

describe('photoBoxEntry', () => {
  it('사진함에서 넘긴 사진을 고른 순서대로 읽고 비우면 없어진다', () => {
    expect(readPhotoBoxEntry()).toBeUndefined();

    startFromPhotoBox(['3', '1', '2']);
    expect(readPhotoBoxEntry()).toEqual(['3', '1', '2']);

    clearPhotoBoxEntry();
    expect(readPhotoBoxEntry()).toBeUndefined();
  });

  it('이동이 취소돼 오래 남은 값은 쓰지 않는다', () => {
    vi.useFakeTimers();
    startFromPhotoBox(['1']);

    vi.advanceTimersByTime(29_000);
    expect(readPhotoBoxEntry()).toEqual(['1']);

    vi.advanceTimersByTime(2_000);
    expect(readPhotoBoxEntry()).toBeUndefined();
  });
});
