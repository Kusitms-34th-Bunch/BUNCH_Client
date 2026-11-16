import { renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { useRecommendationDetail, useRecommendationLoader } from './useRecommendations';

// 실제 hook이 가짜 서버(MSW) 응답을 삭제·실패·준비로 가르는지 확인(화면 테스트는 이 hook을 대역으로 바꿈)
const wrapper = () => createQueryWrapper(createTestQueryClient());

describe('useRecommendationLoader', () => {
  it('번치를 알면 최신 목록과 상세를 받고, 없는 추천은 deleted로 알린다', async () => {
    const { result } = renderHook(() => useRecommendationLoader(), { wrapper: wrapper() });

    // 내 번치(프로필)를 받을 때까지 기다린 뒤 호출
    await waitFor(async () => {
      expect((await result.current.loadList()).kind).toBe('ready');
    });
    const list = await result.current.loadList();
    expect(list.kind === 'ready' && list.data.map((item) => item.id)).toEqual(['1', '2']);

    const detail = await result.current.loadDetail('1');
    expect(detail.kind === 'ready' && detail.data.photos).toHaveLength(6);
    expect((await result.current.loadDetail('77')).kind).toBe('deleted');
  });

  it('번치를 아직 모르면 요청하지 않고 failed로 알린다', async () => {
    const { result } = renderHook(() => useRecommendationLoader(), { wrapper: wrapper() });

    expect((await result.current.loadList()).kind).toBe('failed');
    expect((await result.current.loadDetail('1')).kind).toBe('failed');
  });
});

describe('useRecommendationDetail', () => {
  it('받는 동안 loading, 받으면 ready이고 없는 추천이면 deleted이다', async () => {
    const ready = renderHook(() => useRecommendationDetail('1'), { wrapper: wrapper() });
    expect(ready.result.current.kind).toBe('loading');
    await waitFor(() => expect(ready.result.current.kind).toBe('ready'));

    const gone = renderHook(() => useRecommendationDetail('77'), { wrapper: wrapper() });
    await waitFor(() => expect(gone.result.current.kind).toBe('deleted'));
  });

  it('프로필에 번치가 없으면 로딩에 머물지 않고 error이다', async () => {
    server.use(
      http.get('/api/members/me', () =>
        ok({ memberId: 1, nickname: '효찬', imageUrl: null, defaultBunch: null }),
      ),
    );
    const { result } = renderHook(() => useRecommendationDetail('1'), { wrapper: wrapper() });

    expect(result.current.kind).toBe('loading');
    await waitFor(() => expect(result.current.kind).toBe('error'));
  });

  it('id가 없으면(형식이 틀림) 요청 없이 deleted이다', () => {
    const { result } = renderHook(() => useRecommendationDetail(undefined), {
      wrapper: wrapper(),
    });

    expect(result.current.kind).toBe('deleted');
  });
});
