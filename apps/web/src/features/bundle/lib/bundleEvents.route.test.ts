import { describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { routeBundleEvent } from './bundleEvents';

// 판정이 보는 필드(revision·상태)만 채운 상세
const detail = (revision: number, status = 'DRAFT') =>
  ({
    revision,
    status,
    title: '제목',
    date: null,
    dateVersion: 0,
    dateChips: [],
  }) as unknown as BundleDetail;

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

  it('바로 다음 revision의 내용 이벤트는 그 값과 revision을 반영하고 나머지 필드는 둔다', () => {
    const outcome = routeBundleEvent(
      detail(5),
      event('DATE', 6, { value: '2026-11-24', version: 1, dateChips: ['2026-11-23'] }),
    );

    if (outcome.kind !== 'apply') throw new Error(`outcome is ${outcome.kind}`);
    expect(outcome.detail).toMatchObject({
      revision: 6,
      date: '2026-11-24',
      dateVersion: 1,
      dateChips: ['2026-11-23'],
      title: '제목',
    });
  });

  it('날짜 칩 이벤트는 배열·객체 모두 칩만 바꾸고 revision은 그대로 둔다', () => {
    for (const data of [['2026-11-20'], { dateChips: ['2026-11-20'] }]) {
      const outcome = routeBundleEvent(detail(5), event('DATE_CHIPS', null, data));

      if (outcome.kind !== 'apply') throw new Error(`outcome is ${outcome.kind}`);
      expect(outcome.detail).toMatchObject({ revision: 5, dateChips: ['2026-11-20'] });
    }
  });
});
