import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearPhotoBoxSelection,
  readPhotoBoxSelection,
  rememberPhotoBoxSelection,
} from './selectionResume';

afterEach(() => {
  clearPhotoBoxSelection();
  vi.useRealTimers();
});

describe('selectionResume', () => {
  it('기억한 선택을 고른 순서대로 읽고 비우면 없어진다', () => {
    expect(readPhotoBoxSelection()).toBeUndefined();

    rememberPhotoBoxSelection(['3', '1']);
    expect(readPhotoBoxSelection()).toEqual(['3', '1']);

    clearPhotoBoxSelection();
    expect(readPhotoBoxSelection()).toBeUndefined();
  });

  it('오래 지난 선택은 되살리지 않는다', () => {
    vi.useFakeTimers();
    rememberPhotoBoxSelection(['1']);

    vi.advanceTimersByTime(9 * 60_000);
    expect(readPhotoBoxSelection()).toEqual(['1']);

    vi.advanceTimersByTime(2 * 60_000);
    expect(readPhotoBoxSelection()).toBeUndefined();
  });
});
