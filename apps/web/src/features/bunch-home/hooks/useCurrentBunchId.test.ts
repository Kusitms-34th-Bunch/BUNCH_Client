import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurrentBunchId } from './useCurrentBunchId';

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('useCurrentBunchId', () => {
  it('fixture에 없는 저장값은 기본 번치로 읽는다', () => {
    sessionStorage.setItem('bunch-home:current-bunch-id', 'unknown-bunch');
    const { result } = renderHook(() => useCurrentBunchId());

    expect(result.current[0]).toBe('bunch-trip');
  });

  // 메모리 대체 값이 모듈에 남으므로 이 파일의 마지막 테스트로 둠
  it('저장에 실패해도(용량 초과·사생활 보호 모드) 바꾼 번치를 유지한다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const { result } = renderHook(() => useCurrentBunchId());

    act(() => result.current[1]('bunch-gift'));

    expect(result.current[0]).toBe('bunch-gift');
  });
});
