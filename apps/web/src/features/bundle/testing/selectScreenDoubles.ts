import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { usePhotoBoxFixture } from './usePhotoBoxFixture';

// 번들 만들기 화면 테스트의 대역: 사진은 사진함 샘플, 초안 생성은 API 대신 샘플 초안으로 이동
// 실제 사진 API·초안 생성 요청은 photo-box와 useCreateBundle 테스트가 가짜 서버로 확인
/** 사진함 목록 새로 받기의 대역: 호출 횟수를 세고, `fail`이면 거부함 */
export const photoBoxRefresh = { calls: 0, fail: false };

export const usePhotoBoxDouble = (...args: Parameters<typeof usePhotoBoxFixture>) => ({
  ...usePhotoBoxFixture(...args),
  refresh: () => {
    photoBoxRefresh.calls += 1;
    return photoBoxRefresh.fail ? Promise.reject(new Error('refresh failed')) : Promise.resolve();
  },
});

// 생성 중 상태를 확인할 수 있도록 이동까지 걸리는 시간(테스트가 같은 값만큼 시간을 넘김)
export const DOUBLE_CREATE_DELAY_MS = 10_000;

/** 초안 생성 요청에 실린 값 기록(마지막으로 적용한 추천 번들 id 확인용) */
export const createCalls: { photoIds: readonly string[]; recommendationId?: string | undefined }[] =
  [];

export const useCreateBundleDouble = () => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const create = (
    photoIds: readonly string[],
    participantMemberIds: readonly string[] = [],
    options: { replace?: boolean; recommendationId?: string | undefined } = {},
  ) => {
    if (creating || photoIds.length === 0 || participantMemberIds.length === 0) return;
    createCalls.push({ photoIds, recommendationId: options.recommendationId });
    setCreating(true);
    timer.current = setTimeout(() => {
      const path = BUNDLE_SELECT_PATHS.draft('draft-1');
      if (options.replace) router.replace(path);
      else router.push(path);
    }, DOUBLE_CREATE_DELAY_MS);
  };
  return { create, creating };
};
