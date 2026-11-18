import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import type { BundleDetail, DetailLocation } from '../model/bundle';
import { bundleKeys } from './keys';
import { useLocationCache } from './locations';

const place = (id: string, name: string): DetailLocation => ({
  id,
  provider: 'test',
  externalId: id,
  name,
  address: null,
});

const setup = () => {
  const client = createTestQueryClient();
  const key = bundleKeys.detail('1', '2');
  client.setQueryData(key, {
    id: '2',
    revision: 3,
    locationVersion: 5,
    locations: [place('1', '저장된 장소')],
  });
  const { result } = renderHook(() => useLocationCache('1', '2'), {
    wrapper: createQueryWrapper(client),
  });
  const detail = () => client.getQueryData<BundleDetail>(key)!;
  return { cache: result.current, detail };
};

describe('useLocationCache.writeLocations', () => {
  it('더 새 버전의 응답은 장소 목록과 버전을 바꾸되 번들 revision은 올리지 않는다', () => {
    const { cache, detail } = setup();

    cache.writeLocations([place('2', '새 장소')], 6);

    expect(detail().locations.map((location) => location.name)).toEqual(['새 장소']);
    expect(detail().locationVersion).toBe(6);
    expect(detail().revision).toBe(3);
  });

  it('같은 버전의 응답은 같은 목록이라 그대로 반영한다', () => {
    const { cache, detail } = setup();

    cache.writeLocations([place('1', '저장된 장소'), place('2', '더한 장소')], 5);

    expect(detail().locations).toHaveLength(2);
  });

  it('늦게 도착한 낮은 버전의 응답은 반영하지 않는다', () => {
    const { cache, detail } = setup();

    cache.writeLocations([place('9', '낡은 장소')], 4);

    expect(detail().locations.map((location) => location.name)).toEqual(['저장된 장소']);
    expect(detail().locationVersion).toBe(5);
  });
});
