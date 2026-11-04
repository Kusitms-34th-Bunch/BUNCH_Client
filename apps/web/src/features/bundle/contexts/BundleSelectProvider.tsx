'use client';

import { toast } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePhotoBoxFixture } from '@/features/photo-box/hooks/usePhotoBoxFixture';
import {
  countSelectedByMember,
  toggleSelection,
  type PhotoSelection,
} from '@/features/photo-box/lib/selection';
import { ALL_MEMBERS } from '@/features/photo-box/lib/types';
import { BUNDLE_SELECT_MESSAGES, MAX_SELECT_PHOTOS } from '../constants/selectMessages';
import { BUNDLE_SELECT_PATHS } from '../constants/selectPaths';
import { recommendationFixture } from '../fixtures/recommendation.fixture';
import { applyRecommendation, getApplyDateKey, type Recommendation } from '../lib/recommendation';
import { BundleSelectContext, type BundleSelectValue } from './bundleSelectContext';

// 목 번들 생성이 끝나기까지의 시간(화면 전체 로딩이 보이도록)
const MOCK_CREATE_DELAY_MS = 800;
// 초안 생성 API 연결 전에는 샘플 초안으로 이동
const SAMPLE_DRAFT_ID = 'draft-1';

const notify = (message: string) => toast(message, { fullWidth: true });

type BundleSelectProviderProps = {
  children: ReactNode;
  /** 추천 번들 목록. 기본은 샘플(빈 목록이면 시트가 빈 상태) */
  recommendations?: readonly Recommendation[] | undefined;
  /** 목 번들 생성이 끝나기까지의 시간(테스트에서 줄임) */
  createDelayMs?: number | undefined;
};

/**
 * 번들 만들기 흐름(사진 선택 → 추천 번들 시트 → 상세 → 뷰어)의 상태를 route layout에서 한 번 들고 있는 provider
 * 상세·뷰어로 이동해도 고른 사진과 시트 열림이 유지되고, 이 흐름을 벗어나면 함께 사라져 선택을 버림(기획 4.1)
 * 사진·추천 목록 API 연결 전에는 사진함 fixture와 추천 fixture이고, 연결하면 이 provider의 데이터 출처만 바꿈
 */
export function BundleSelectProvider({
  children,
  recommendations = recommendationFixture,
  createDelayMs = MOCK_CREATE_DELAY_MS,
}: BundleSelectProviderProps) {
  const router = useRouter();
  const { state: photoState } = usePhotoBoxFixture();
  const photos = photoState.kind === 'ready' ? photoState.data.photos : undefined;

  const [selection, setSelection] = useState<PhotoSelection>([]);
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const [changeOpen, setChangeOpen] = useState(false);
  const [scrollTarget, setScrollTarget] = useState<BundleSelectValue['scrollTarget']>(undefined);
  const [creating, setCreating] = useState(false);
  const nonce = useRef(0);
  const createTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(createTimer.current), []);

  const selectedCounts = useMemo(
    () => (photos && selection.length > 0 ? countSelectedByMember(selection, photos) : {}),
    [photos, selection],
  );
  // 시트 열고 닫기는 effect에서도 부르므로 참조를 고정
  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const clearScrollTarget = useCallback(() => setScrollTarget(undefined), []);
  const picked = recommendations.find((item) => item.id === pickedId);

  const toggle = useCallback(
    (photoId: string) => {
      const result = toggleSelection(selection, photoId, MAX_SELECT_PHOTOS);
      if (result.rejected) notify(BUNDLE_SELECT_MESSAGES.maxPhotos);
      else setSelection(result.selection);
    },
    [selection],
  );

  // 추천 사진 전부를 추천 순서대로 선택하고 시트를 닫은 뒤 그 날짜 섹션으로 스크롤, 토스트로 장수를 알림
  const commit = (recommendation: Recommendation) => {
    const next = applyRecommendation(recommendation, photos ?? []);
    setSelection(next);
    // 필터가 걸려 있으면 고른 사진이 목록에서 가려질 수 있어 「전체」로 되돌림
    setMemberId(ALL_MEMBERS);
    setSheetOpen(false);
    setChangeOpen(false);
    const dateKey = getApplyDateKey(recommendation, photos ?? []);
    if (dateKey) {
      nonce.current += 1;
      setScrollTarget({ dateKey, nonce: nonce.current });
    }
    notify(BUNDLE_SELECT_MESSAGES.applied(next.length));
  };

  const apply = () => {
    if (!picked) return;
    // 추천 사진이 모두 사라졌으면 기존 선택을 지우지 않고 안내만 함
    if (applyRecommendation(picked, photos ?? []).length === 0) {
      notify(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
      return;
    }
    // 이미 고른 사진이 있으면 뒤의 시트를 내리고 변경 확인(기획 4.2.4)
    if (selection.length > 0) {
      setSheetOpen(false);
      setChangeOpen(true);
    } else commit(picked);
  };

  const create = () => {
    if (creating || selection.length === 0) return;
    setCreating(true);
    createTimer.current = setTimeout(
      () => router.push(BUNDLE_SELECT_PATHS.draft(SAMPLE_DRAFT_ID)),
      createDelayMs,
    );
  };

  const value: BundleSelectValue = {
    photoState,
    recommendations,
    selection,
    selectedCounts,
    memberId,
    sheetOpen,
    pickedId,
    changeOpen,
    scrollTarget,
    creating,
    clearScrollTarget,
    setMemberId,
    toggle,
    openSheet,
    closeSheet,
    togglePicked: (id) => setPickedId((current) => (current === id ? undefined : id)),
    apply,
    confirmChange: () => {
      if (picked) commit(picked);
    },
    // 취소하면 시트를 다시 올리고 카드 선택과 기존 선택을 그대로 둠
    cancelChange: () => {
      setChangeOpen(false);
      setSheetOpen(true);
    },
    create,
  };

  return <BundleSelectContext.Provider value={value}>{children}</BundleSelectContext.Provider>;
}
