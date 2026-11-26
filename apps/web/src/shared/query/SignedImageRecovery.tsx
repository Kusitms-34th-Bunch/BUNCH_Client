'use client';

import { type Query, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { forgetSignedUrl } from '@/shared/api/client/stableSignedUrls';

// 같은 파일은 이 간격에 한 번만 다시 받음(서버가 요청마다 새로 서명해 주소로는 못 막음, 없는 사진이면 반복하지 않게)
const RETRY_GAP_MS = 15 * 60 * 1000;
// 이미지 오류는 장마다 따로 들어와 잠깐 모은 뒤 한 번에 처리
const BATCH_MS = 100;

// 편집 중 고정한 query(staleTime 무한): 보고 있는 화면의 옵션을 먼저, 없으면 마지막으로 받은 옵션
// staleTime은 query에도 저장되지만 QueryOptions 타입에는 없음
const isFrozen = (query: Query) =>
  query.observers.some((observer) => observer.options.staleTime === Infinity) ||
  (query.options as { staleTime?: unknown }).staleTime === Infinity;

/**
 * 서명 사진 주소가 만료돼 이미지를 불러오지 못하면 그 주소를 가진 query를 다시 받음(#587)
 * 켜 둔 앱이 캐시의 지난 주소로 새 사진 칸을 그려 앱을 다시 켤 때까지 비던 문제. 편집 중 고정한 query(staleTime 무한)는 건드리지 않음
 */
export function SignedImageRecovery() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const retriedAt = new Map<string, number>();
    const failed = new Set<string>();
    // 이번 묶음에 들어간 파일(같은 파일의 다른 주소를 다른 query가 가질 수 있어 함께 담음)
    const batchFiles = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 만료된 칸들이 한꺼번에 실패해도 캐시는 한 번만 훑음
    const flush = () => {
      timer = undefined;
      const sources = [...failed];
      failed.clear();
      batchFiles.clear();
      const hasFailedSrc = (query: Query) => {
        // 다시 받다 실패한 query도 이전 data(만료 주소)를 그대로 보이므로 data가 있으면 대상
        if (query.state.data === undefined || isFrozen(query)) return false;
        const text = JSON.stringify(query.state.data);
        return sources.some((src) => text.includes(src));
      };
      const isFetchingMore = (query: Query) => query.state.fetchMeta?.fetchMore !== undefined;
      // 다음 쪽 받기는 이전 쪽 주소를 바꾸지 않아 끊고 처음 쪽부터 다시 받음
      void queryClient.invalidateQueries({
        predicate: (query) => isFetchingMore(query) && hasFailedSrc(query),
        refetchType: 'active',
      });
      // 그 밖의 진행 중 요청은 이미 새 주소를 받아 오는 중이라 끊지 않음
      void queryClient.invalidateQueries(
        {
          predicate: (query) => !isFetchingMore(query) && hasFailedSrc(query),
          refetchType: 'active',
        },
        { cancelRefetch: false },
      );
    };
    const onError = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      const src = image.currentSrc || image.src;
      const file = forgetSignedUrl(src);
      if (!file) return;
      if (!batchFiles.has(file)) {
        const now = Date.now();
        if (now - (retriedAt.get(file) ?? -Infinity) < RETRY_GAP_MS) return;
        retriedAt.set(file, now);
        batchFiles.add(file);
      }
      timer ??= setTimeout(flush, BATCH_MS);
      failed.add(src);
    };
    // 이미지 error는 올라오지 않아 capture로 받음
    document.addEventListener('error', onError, true);
    return () => {
      document.removeEventListener('error', onError, true);
      clearTimeout(timer);
    };
  }, [queryClient]);
  return null;
}
