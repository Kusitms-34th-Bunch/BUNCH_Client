import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { fail } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { useCheckBundleVisible } from './bundleDetail';
import { feedKeys } from './keys';

const DETAIL_PATH = '/api/bunches/:bunchId/published-bundles/:bundleId';

// 콕 시드가 가리키는 발행 번들(지금 번치 명의로 볼 수 있음)
const visibleBundle = () => {
  const bundle = mockDb.get().bundles.find((item) => item.id === 901)!;
  return { bunchId: String(bundle.bunchId), bundleId: String(bundle.id) };
};

const setup = () => {
  const client = createTestQueryClient();
  const { result } = renderHook(() => useCheckBundleVisible(), {
    wrapper: createQueryWrapper(client),
  });
  return { client, check: result.current };
};

describe('useCheckBundleVisible(기능명세서 8.1.5 로직 1)', () => {
  it('지금 볼 수 있는 번들이면 visible이고, 받은 상세를 캐시에 남긴다', async () => {
    const { client, check } = setup();
    const { bunchId, bundleId } = visibleBundle();

    await expect(check(bunchId, bundleId)).resolves.toBe('visible');

    // 상세 화면이 읽는 key(지금 번치 명의)에 그대로 들어감(상세가 바로 그려짐)
    const viewerId = client.getQueryData(myProfileQueryOptions().queryKey)?.bunch?.id ?? null;
    expect(viewerId).not.toBeNull();
    expect(client.getQueryData(feedKeys.detail(bunchId, bundleId, viewerId))).toBeDefined();
  });

  it.each([404, 403, 400])(
    '상세가 %s이면 hidden이다(번들 상세 화면과 같은 판정)',
    async (status) => {
      server.use(http.get(DETAIL_PATH, () => fail(status, 'RESOURCE_001')));
      const { check } = setup();
      const { bunchId, bundleId } = visibleBundle();

      await expect(check(bunchId, bundleId)).resolves.toBe('hidden');
    },
  );

  it('확인 요청 자체가 실패하면 reject한다', async () => {
    server.use(http.get(DETAIL_PATH, () => HttpResponse.error()));
    const { check } = setup();
    const { bunchId, bundleId } = visibleBundle();

    await expect(check(bunchId, bundleId)).rejects.toBeDefined();
  });

  it('캐시가 있어도 다시 받아 그사이 볼 수 없게 된 번들을 알아챈다', async () => {
    const { check } = setup();
    const { bunchId, bundleId } = visibleBundle();
    await check(bunchId, bundleId);
    server.use(http.get(DETAIL_PATH, () => fail(404, 'RESOURCE_001')));

    await expect(check(bunchId, bundleId)).resolves.toBe('hidden');
  });
});
