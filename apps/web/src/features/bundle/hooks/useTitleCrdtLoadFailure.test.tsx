import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type * as TitleCrdt from '../lib/titleCrdt';
import type { BundleDetail } from '../model/bundle';
import { useTitleCrdt } from './useTitleCrdt';

const ensure = vi.hoisted(() => vi.fn());

vi.mock('../lib/titleCrdt', async (importOriginal) => ({
  ...(await importOriginal<typeof TitleCrdt>()),
  ensureTitleCrdt: ensure,
}));

const detail = { id: '1', status: 'DRAFT', titleCrdtState: 'AAAA' } as BundleDetail;

describe('useTitleCrdt 불러오기 실패', () => {
  it('문서를 불러오지 못하면 실패로 알리고 입력을 막으며, 다시 시도하면 실패가 풀린다', async () => {
    ensure.mockRejectedValueOnce(new Error('chunk load failed'));
    ensure.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useTitleCrdt(detail));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.ready).toBe(false);
    expect(result.current.edit('가')).toBe(false);

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(ensure).toHaveBeenCalledTimes(2);
  });
});
