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
  it('기억한 선택을 번치와 함께 고른 순서대로 읽고, 읽어도 남아 있다가 비우면 없어진다', () => {
    expect(readPhotoBoxSelection()).toBeUndefined();

    rememberPhotoBoxSelection('7', ['3', '1']);
    expect(readPhotoBoxSelection()).toEqual({ bunchId: '7', photoIds: ['3', '1'] });
    expect(readPhotoBoxSelection()).toEqual({ bunchId: '7', photoIds: ['3', '1'] });

    clearPhotoBoxSelection();
    expect(readPhotoBoxSelection()).toBeUndefined();
  });

  it('2분이 지난 선택은 되살리지 않는다', () => {
    vi.useFakeTimers();
    rememberPhotoBoxSelection('7', ['1']);

    vi.advanceTimersByTime(110_000);
    expect(readPhotoBoxSelection()?.photoIds).toEqual(['1']);

    vi.advanceTimersByTime(20_000);
    expect(readPhotoBoxSelection()).toBeUndefined();
  });
});
