import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { usePhotoBoxFixture } from '@/features/photo-box/hooks/usePhotoBoxFixture';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';

// 번들 만들기 화면 테스트의 대역: 사진은 사진함 샘플, 초안 생성은 API 대신 샘플 초안으로 이동
// 실제 사진 API·초안 생성 요청은 photo-box와 useCreateBundle 테스트가 가짜 서버로 확인
export { legacyRecommendationFixture } from '../fixtures/recommendation.legacy.fixture';
export const usePhotoBoxDouble = usePhotoBoxFixture;

// 생성 중 상태를 확인할 수 있도록 이동까지 걸리는 시간(테스트가 같은 값만큼 시간을 넘김)
export const DOUBLE_CREATE_DELAY_MS = 10_000;

export const useCreateBundleDouble = () => {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const create = (photoIds: readonly string[]) => {
    if (creating || photoIds.length === 0) return;
    setCreating(true);
    timer.current = setTimeout(
      () => router.push(BUNDLE_SELECT_PATHS.draft('draft-1')),
      DOUBLE_CREATE_DELAY_MS,
    );
  };
  return { create, creating };
};
