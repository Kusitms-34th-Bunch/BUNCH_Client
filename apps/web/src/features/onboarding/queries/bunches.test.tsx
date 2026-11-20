import { act, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { useChangeBunchPhotoMutation } from './bunches';

const bunchBody = (imageUrl: string | null) => ({
  id: 7,
  name: '퇴근런클럽',
  characterType: 'TYPE_1' as const,
  imageUrl,
});
// 조정을 마친 사진(512px JPEG data URL)을 대신하는 작은 JPEG
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==';

describe('useChangeBunchPhotoMutation', () => {
  it('화면을 다시 열어 같은 번치 사진을 또 바꿔도 앞 요청이 끝난 뒤 보내, 나중 결과가 남는다', async () => {
    const order: string[] = [];
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.put('/api/bunches/7/profile-image', async () => {
        order.push('put:start');
        await gate;
        order.push('put:end');
        return ok(bunchBody('https://cdn.example.com/a.jpg'));
      }),
      http.delete('/api/bunches/7/profile-image', () => {
        order.push('delete');
        return ok(bunchBody(null));
      }),
    );
    const client = createTestQueryClient();
    const wrapper = createQueryWrapper(client);
    const changed = vi.fn();
    // 사진 저장 중 화면을 떠났다가 다시 연 것처럼 두 번째 인스턴스를 따로 만듦
    const first = renderHook(() => useChangeBunchPhotoMutation('7', changed), { wrapper });
    const second = renderHook(() => useChangeBunchPhotoMutation('7', changed), { wrapper });

    act(() => first.result.current.mutate(PHOTO));
    await waitFor(() => expect(order).toEqual(['put:start']));
    act(() => second.result.current.mutate(undefined));
    // 앞 요청이 끝나기 전에는 기본 이미지 적용을 보내지 않음(보냈다면 도착할 만큼 기다린 뒤 확인)
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(order).toEqual(['put:start']);

    release();

    await waitFor(() => expect(order).toEqual(['put:start', 'put:end', 'delete']));
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(2));
    // 사진 변경 → 기본 이미지 적용 순서로 반영돼 마지막은 기본 이미지(사진 주소 없음)
    expect(changed.mock.calls.map(([bunch]) => (bunch as { imageUrl?: string }).imageUrl)).toEqual([
      'https://cdn.example.com/a.jpg',
      undefined,
    ]);
  });
});
