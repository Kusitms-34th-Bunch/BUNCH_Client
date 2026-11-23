import { describe, expect, it } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { mergeFetchedDetail } from './bundleEvents';

// 이 테스트가 보는 필드만 채운 상세
const detail = (patch: Partial<BundleDetail>) =>
  ({
    revision: 3,
    title: '제목',
    titleVersion: 1,
    titleTooLong: false,
    titleCrdtState: 'state',
    locationVersion: 1,
    locations: [],
    photos: [],
    publishBlockers: [],
    ...patch,
  }) as unknown as BundleDetail;

describe('mergeFetchedDetail', () => {
  it('캐시가 비었으면 받은 상세를 쓴다', () => {
    const incoming = detail({});
    expect(mergeFetchedDetail(undefined, incoming)).toBe(incoming);
  });

  it('더 낡은 revision 응답은 버리고 캐시 값을 유지한다', () => {
    const previous = detail({ revision: 4 });
    expect(mergeFetchedDetail(previous, detail({ revision: 3, title: '옛 제목' }))).toBe(previous);
  });

  it('바뀐 것이 없으면 캐시 참조를 그대로 유지한다', () => {
    const previous = detail({});
    expect(mergeFetchedDetail(previous, detail({}))).toBe(previous);
  });

  it('같은 revision이어도 더 높은 제목 버전은 되돌리지 않는다', () => {
    const previous = detail({ title: '새 제목', titleVersion: 2 });
    expect(mergeFetchedDetail(previous, detail({ title: '옛 제목', titleVersion: 1 })).title).toBe(
      '새 제목',
    );
  });
});
