import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDemographicsConsent } from './useDemographicsConsent';

beforeEach(() => window.localStorage.clear());

describe('useDemographicsConsent(임시, 이 기기에만 저장)', () => {
  it('처음에는 동의하지 않은 상태이고, 바꾸면 저장되어 다른 사용처에도 반영된다', () => {
    const first = renderHook(() => useDemographicsConsent());
    const second = renderHook(() => useDemographicsConsent());
    expect(first.result.current[0]).toBe(false);

    act(() => first.result.current[1](true));

    expect(first.result.current[0]).toBe(true);
    expect(second.result.current[0]).toBe(true);
    expect(window.localStorage.getItem('bunch:demographics-consent')).toBe('true');

    act(() => second.result.current[1](false));
    expect(first.result.current[0]).toBe(false);
  });

  it('저장된 값이 있으면 그 값으로 시작한다', () => {
    window.localStorage.setItem('bunch:demographics-consent', 'true');

    const { result } = renderHook(() => useDemographicsConsent());

    expect(result.current[0]).toBe(true);
  });
});
