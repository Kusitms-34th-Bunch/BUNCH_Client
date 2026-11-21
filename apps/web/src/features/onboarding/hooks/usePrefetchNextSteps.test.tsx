import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePrefetchNextSteps } from './usePrefetchNextSteps';

const prefetch = vi.fn();
// 실제 useRouter처럼 렌더마다 같은 객체
const router = { prefetch };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('usePrefetchNextSteps', () => {
  it('다음 단계 화면을 그려지자마자 한 번씩 미리 받고, 같은 경로로 다시 그려지면 다시 받지 않는다', () => {
    const { rerender } = renderHook(() => usePrefetchNextSteps('/a', '/b'));
    rerender();

    expect(prefetch.mock.calls).toEqual([['/a'], ['/b']]);
  });
});
