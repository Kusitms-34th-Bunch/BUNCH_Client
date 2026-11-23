import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPLOAD_STATUS_COLLAPSE_AT, UPLOAD_STATUS_TIMING, uploadStatusStore } from './uploadStatus';

const createUrl = vi.fn(() => 'blob:first');
const revokeUrl = vi.fn();
const statusOf = (bunchId = 'b1') => uploadStatusStore.getSnapshot()[bunchId];

beforeEach(() => {
  vi.useFakeTimers();
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = revokeUrl;
  createUrl.mockClear();
  revokeUrl.mockClear();
  uploadStatusStore.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('uploadStatusStore', () => {
  it('올리는 중에 같은 번치에 또 올리면 장수를 합치고, 모든 묶음이 끝나야 합친 결과로 완료한다', () => {
    uploadStatusStore.begin('b1', 2);
    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.begin('b1', 1);
    expect(statusOf()).toMatchObject({ phase: 'uploading', total: 3, done: 1 });

    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.end('b1');
    expect(statusOf()?.phase).toBe('uploading');

    uploadStatusStore.advance('b1', 'skipped', false);
    uploadStatusStore.end('b1');
    expect(statusOf()).toMatchObject({
      phase: 'complete',
      done: 3,
      message: '중복된 1장을 제외하고, 사진 2장을 추가했어요.',
      withBundleHint: true,
    });
  });

  it('썸네일은 처음 정한 이미지만 쓰고, 상태를 지울 때 주소를 놓아 준다', () => {
    uploadStatusStore.watch('b1');
    uploadStatusStore.begin('b1', 2);
    uploadStatusStore.setThumbnail('b1', new Blob(['a']));
    uploadStatusStore.setThumbnail('b1', new Blob(['b']));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(statusOf()?.thumbnailUrl).toBe('blob:first');

    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.end('b1');
    vi.advanceTimersByTime(UPLOAD_STATUS_COLLAPSE_AT + UPLOAD_STATUS_TIMING.collapse);

    expect(statusOf()).toBeUndefined();
    expect(revokeUrl).toHaveBeenCalledWith('blob:first');
  });

  it('사진함이 보이는 중에 끝나면 바로 유지 시간을 세고, 접힘이 끝날 때까지 남았다가 지워진다', () => {
    uploadStatusStore.watch('b1');
    uploadStatusStore.begin('b1', 1);
    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.end('b1');

    expect(statusOf()).toMatchObject({ phase: 'complete', shownAt: Date.now() });
    vi.advanceTimersByTime(UPLOAD_STATUS_COLLAPSE_AT + UPLOAD_STATUS_TIMING.collapse - 1);
    expect(statusOf()?.phase).toBe('complete');
    vi.advanceTimersByTime(1);
    expect(statusOf()).toBeUndefined();
  });

  it('보는 화면이 없을 때 끝나면 결과를 들고 기다리다가, 보였다고 표시한 때부터 유지 시간을 센다', () => {
    uploadStatusStore.begin('b1', 1);
    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.end('b1');

    vi.advanceTimersByTime(60_000);
    expect(statusOf()).toMatchObject({ phase: 'complete', shownAt: undefined });

    uploadStatusStore.markShown('b1');
    expect(statusOf()).toMatchObject({ shownAt: Date.now() });
    vi.advanceTimersByTime(UPLOAD_STATUS_COLLAPSE_AT + UPLOAD_STATUS_TIMING.collapse);
    expect(statusOf()).toBeUndefined();
  });

  it('사진함 탭이 숨어 있는 동안(다른 탭) 끝나면 보는 화면이 있어도 기다린다', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    uploadStatusStore.watch('b1');
    uploadStatusStore.begin('b1', 1);
    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.end('b1');
    visibility.mockRestore();

    expect(statusOf()).toMatchObject({ phase: 'complete', shownAt: undefined });
  });

  it('완료 문구가 떠 있는 동안 새로 올리면 새 줄로 다시 시작하고, 이전 지우기 예약은 걷는다', () => {
    uploadStatusStore.watch('b1');
    uploadStatusStore.begin('b1', 1);
    uploadStatusStore.advance('b1', 'added', false);
    uploadStatusStore.end('b1');

    uploadStatusStore.begin('b1', 4);
    expect(statusOf()).toMatchObject({ phase: 'uploading', total: 4, done: 0 });
    vi.advanceTimersByTime(UPLOAD_STATUS_COLLAPSE_AT + UPLOAD_STATUS_TIMING.collapse);
    expect(statusOf()?.phase).toBe('uploading');
  });

  it('알릴 결과가 없으면(올린 사진이 없음) 완료 문구 없이 바로 지운다', () => {
    uploadStatusStore.begin('b1', 0);
    uploadStatusStore.end('b1');
    expect(statusOf()).toBeUndefined();
  });

  it('진행 칸은 사진을 받으면 1칸, 결과가 나오면 1칸이고, 받지 못한 사진은 결과 때 2칸을 채운다', () => {
    uploadStatusStore.begin('b1', 2);
    uploadStatusStore.markRead('b1', new Blob(['a']));
    expect(statusOf()).toMatchObject({ steps: 1, done: 0, thumbnailUrl: 'blob:first' });

    uploadStatusStore.advance('b1', 'added', true);
    expect(statusOf()).toMatchObject({ steps: 2, done: 1 });

    uploadStatusStore.advance('b1', 'failed', false);
    expect(statusOf()).toMatchObject({ steps: 4, done: 2 });
  });

  it('올리는 중에 같은 번치에 더 올려 장수가 늘어도 진행 바는 뒤로 가지 않고, 실제 진행이 따라잡으면 다시 간다', () => {
    uploadStatusStore.begin('b1', 2);
    uploadStatusStore.advance('b1', 'added', false);
    expect(statusOf()?.progress).toBe(0.5);

    // 2장을 더 고름: 칸 기준으로는 4칸 중 2칸이 아니라 8칸 중 2칸(25%)이지만 50%에 머묾
    uploadStatusStore.begin('b1', 2);
    expect(statusOf()).toMatchObject({ total: 4, steps: 2, progress: 0.5 });
    uploadStatusStore.advance('b1', 'added', false);
    expect(statusOf()?.progress).toBe(0.5);
    uploadStatusStore.advance('b1', 'added', false);
    expect(statusOf()?.progress).toBe(0.75);
  });

  it('상태 줄을 보는 화면은 번치별로 세고, 모두 해제하면 보는 화면이 없다', () => {
    const first = uploadStatusStore.watch('b1');
    const second = uploadStatusStore.watch('b1');
    expect(uploadStatusStore.isWatched('b1')).toBe(true);
    expect(uploadStatusStore.isWatched('b2')).toBe(false);

    first();
    expect(uploadStatusStore.isWatched('b1')).toBe(true);
    second();
    expect(uploadStatusStore.isWatched('b1')).toBe(false);
  });

  it('번치마다 따로 센다', () => {
    uploadStatusStore.begin('b1', 1);
    uploadStatusStore.begin('b2', 2);
    uploadStatusStore.advance('b2', 'failed', false);

    expect(statusOf('b1')).toMatchObject({ total: 1, done: 0 });
    expect(statusOf('b2')).toMatchObject({ total: 2, done: 1 });
  });
});
