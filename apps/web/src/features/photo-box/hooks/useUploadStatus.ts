'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { isPageVisible, uploadStatusStore, type UploadStatus } from '../lib/uploadStatus';

/**
 * 이 번치의 사진함 업로드 상태(올리는 중·완료). 없으면 undefined
 * 번치를 넘기는 동안 그 번치의 상태 줄을 보이는 화면으로 등록해, 끝났을 때 토스트 대신 상태 줄로 알리게 함
 * 상태 줄을 그리지 않는 동안(로딩·오류·번치 없음)은 undefined를 넘겨 등록하지 않음
 * 다른 탭에 가 있는 동안 끝난 결과는 사진함이 다시 보이는 순간 보인 것으로 표시해, 그때부터 5초 유지함
 */
export function useUploadStatus(bunchId: string | undefined): UploadStatus | undefined {
  useEffect(
    () => (bunchId === undefined ? undefined : uploadStatusStore.watch(bunchId)),
    [bunchId],
  );
  const all = useSyncExternalStore(
    uploadStatusStore.subscribe,
    uploadStatusStore.getSnapshot,
    uploadStatusStore.getServerSnapshot,
  );
  const status = bunchId === undefined ? undefined : all[bunchId];
  const waitingToShow = status?.phase === 'complete' && status.shownAt === undefined;
  useEffect(() => {
    if (bunchId === undefined || !waitingToShow) return;
    const showIfVisible = () => {
      if (isPageVisible()) uploadStatusStore.markShown(bunchId);
    };
    showIfVisible();
    document.addEventListener('visibilitychange', showIfVisible);
    return () => document.removeEventListener('visibilitychange', showIfVisible);
  }, [bunchId, waitingToShow]);
  return status;
}
