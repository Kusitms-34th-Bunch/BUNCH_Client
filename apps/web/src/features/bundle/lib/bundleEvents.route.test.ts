import { describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { routeBundleEvent } from './bundleEvents';

// 판정이 보는 필드(revision·상태)만 채운 상세
const detail = (revision: number, status = 'DRAFT') =>
  ({ revision, status, dateChips: [] }) as unknown as BundleDetail;

const event = (type: string, revision?: number | null, data: unknown = {}) => ({
  type,
  revision: revision ?? null,
  data,
});

describe('routeBundleEvent', () => {
  it('상태 전환은 revision과 상관없이 다시 받고, 캐시가 없으면 무시한다', () => {
    expect(routeBundleEvent(detail(5), event('PERMISSIONS', 1)).kind).toBe('refetch');
    expect(routeBundleEvent(detail(5), event('PUBLISHED')).kind).toBe('refetch');
    expect(routeBundleEvent(undefined, event('DELETED', 9)).kind).toBe('ignore');
  });

  it('내용 이벤트는 이미 반영된 revision이면 무시하고, 건너뛰었으면 다시 받는다', () => {
    expect(routeBundleEvent(detail(5), event('COMMENT', 5)).kind).toBe('ignore');
    expect(routeBundleEvent(detail(5), event('COMMENT', 4)).kind).toBe('ignore');
    expect(routeBundleEvent(detail(5), event('COMMENT', 7)).kind).toBe('refetch');
  });

  it('초안이 아니거나 캐시가 없거나 revision이 없으면 내용 이벤트를 무시한다', () => {
    expect(routeBundleEvent(detail(5, 'PUBLISHED'), event('COMMENT', 6)).kind).toBe('ignore');
    expect(routeBundleEvent(undefined, event('COMMENT', 6)).kind).toBe('ignore');
    expect(routeBundleEvent(detail(5), event('COMMENT', null)).kind).toBe('ignore');
  });

  it('모르는 type은 무시한다', () => {
    expect(routeBundleEvent(detail(5), event('UNKNOWN', 6)).kind).toBe('ignore');
  });

  it('바로 다음 revision의 data 모양이 다르면 추측하지 않고 다시 받는다', () => {
    expect(routeBundleEvent(detail(5), event('COMMENT', 6, { wrong: true })).kind).toBe('refetch');
  });
});
