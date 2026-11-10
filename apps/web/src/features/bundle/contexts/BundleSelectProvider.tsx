'use client';

import { toast } from '@app/design-system';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';
import {
  countSelectedByMember,
  pruneSelection,
  toggleSelection,
  type PhotoSelection,
} from '@/features/photo-box/lib/selection';
import { ALL_MEMBERS } from '@/features/photo-box/lib/types';
import { BUNDLE_SELECT_MESSAGES, MAX_SELECT_PHOTOS } from '../constants/selectMessages';
import { recommendationFixture } from '../fixtures/recommendation.fixture';
import { useCreateBundle } from '../hooks/useCreateBundle';
import { applyRecommendation, getApplyDateKey, type Recommendation } from '../lib/recommendation';
import { BundleSelectContext, type BundleSelectValue } from './bundleSelectContext';

const notify = (message: string) => toast(message);

type BundleSelectProviderProps = {
  children: ReactNode;
  /** 추천 번들 목록. 기본은 샘플(빈 목록이면 시트가 빈 상태) */
  recommendations?: readonly Recommendation[] | undefined;
  /** 처음부터 추가돼 있는 멤버 id(테스트·스토리용). 기본은 없음 */
  initialMemberIds?: readonly string[] | undefined;
};

/**
 * 번들 만들기 흐름(멤버 선택 → 사진 선택 → 추천 번들 시트 → 상세 → 뷰어)의 상태를 route layout에서 한 번 들고 있는 provider
 * 상세·뷰어로 이동해도 고른 사진과 시트 열림이 유지되고, 이 흐름을 벗어나면 함께 사라져 선택을 버림(기획 4.1)
 * 사진은 사진함 API, 추천 번들은 목록 API가 없어 fixture이고(연결하면 이 provider의 데이터 출처만 바꿈) 「번들 만들기」는 초안 생성 API
 */
export function BundleSelectProvider({
  children,
  recommendations = recommendationFixture,
  initialMemberIds = [],
}: BundleSelectProviderProps) {
  const { state: photoState, retry } = usePhotoBox();
  const { create: createBundle, creating } = useCreateBundle();
  const photos = photoState.kind === 'ready' ? photoState.data.photos : undefined;

  const [selection, setSelection] = useState<PhotoSelection>([]);
  const [memberIds, setMemberIds] = useState<readonly string[]>(initialMemberIds);
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const [scrollTarget, setScrollTarget] = useState<BundleSelectValue['scrollTarget']>(undefined);
  const nonce = useRef(0);

  const selectedCounts = useMemo(
    () => (photos && selection.length > 0 ? countSelectedByMember(selection, photos) : {}),
    [photos, selection],
  );
  // 시트 열고 닫기는 effect에서도 부르므로 참조를 고정
  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const clearScrollTarget = useCallback(() => setScrollTarget(undefined), []);

  const toggle = useCallback(
    (photoId: string) => {
      const result = toggleSelection(selection, photoId, MAX_SELECT_PHOTOS);
      if (result.rejected) notify(BUNDLE_SELECT_MESSAGES.maxPhotos);
      else setSelection(result.selection);
    },
    [selection],
  );

  // 멤버를 추가·해제. 멤버 칩 필터로 보던 멤버를 해제하면 「전체」로 되돌림
  const toggleMember = useCallback((id: string) => {
    setMemberIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
    setMemberId((current) => (current === id ? ALL_MEMBERS : current));
  }, []);

  // 추천 사진 전부를 추천 순서대로 선택하고 그 날짜 섹션으로 스크롤, 토스트로 장수를 알림
  const commit = (recommendation: Recommendation) => {
    const next = applyRecommendation(recommendation, photos ?? []);
    setSelection(next);
    // 필터가 걸려 있으면 고른 사진이 목록에서 가려질 수 있어 「전체」로 되돌림
    setMemberId(ALL_MEMBERS);
    const dateKey = getApplyDateKey(recommendation, photos ?? []);
    if (dateKey) {
      nonce.current += 1;
      setScrollTarget({ dateKey, nonce: nonce.current });
    }
    notify(BUNDLE_SELECT_MESSAGES.applied(next.length));
  };

  // 카드를 누르면 바로 적용(Figma 시트에는 「적용하기」 버튼이 없음)
  const pickRecommendation = (id: string) => {
    const target = recommendations.find((item) => item.id === id);
    if (!target) return 'deleted';
    setPickedId(id);
    // 추천 사진이 모두 사라졌으면 기존 선택을 지우지 않고 안내만 함
    if (applyRecommendation(target, photos ?? []).length === 0) {
      notify(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
      return 'deleted';
    }
    // 이미 고른 사진이 있으면 뒤의 시트를 내리고 변경 확인(기획 4.2.4)
    if (selection.length > 0) return 'confirm';
    commit(target);
    return 'applied';
  };

  // 실행 직전 고른 사진이 사진함에서 사라졌는지 확인하고, 사라졌으면 선택에서 빼고 중단(기획 4.1.3)
  const create = () => {
    if (creating || selection.length === 0 || !photos) return;
    const { selection: kept, removedCount } = pruneSelection(
      selection,
      new Set(photos.map((photo) => photo.id)),
    );
    if (removedCount > 0) {
      setSelection(kept);
      notify(BUNDLE_SELECT_MESSAGES.selectionStale(removedCount));
      return;
    }
    createBundle(selection);
  };

  const value: BundleSelectValue = {
    photoState,
    retry,
    recommendations,
    selection,
    selectedCounts,
    memberIds,
    memberId,
    sheetOpen,
    pickedId,
    scrollTarget,
    creating,
    clearScrollTarget,
    setMemberId,
    toggleMember,
    toggle,
    openSheet,
    closeSheet,
    pickRecommendation,
    confirmChange: (id) => {
      const target = recommendations.find((item) => item.id === id);
      if (!target) return;
      // 확인 창이 떠 있는 사이 추천 사진이 모두 사라졌으면 기존 선택을 지우지 않고 안내만 함
      if (applyRecommendation(target, photos ?? []).length === 0) {
        notify(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
        return;
      }
      commit(target);
    },
    create,
  };

  return <BundleSelectContext.Provider value={value}>{children}</BundleSelectContext.Provider>;
}
