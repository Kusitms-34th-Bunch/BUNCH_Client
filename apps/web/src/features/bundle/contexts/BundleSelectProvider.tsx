'use client';

import { toast } from '@app/design-system';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PHOTO_BOX_PATHS } from '@/features/photo-box/constants/paths';
import { usePhotoBox } from '@/features/photo-box/hooks/usePhotoBox';
import {
  countSelectedByMember,
  pruneSelection,
  toggleSelection,
  type PhotoSelection,
} from '@/features/photo-box/lib/selection';
import { ALL_MEMBERS } from '@/features/photo-box/lib/types';
import { useBackOr } from '@/shared/hooks/useBackOr';
import type { RecommendationDetail } from '../model/recommendation';
import { BUNDLE_SELECT_MESSAGES, MAX_SELECT_PHOTOS } from '../constants/selectMessages';
import { useCreateBundle } from '../hooks/useCreateBundle';
import { useRecommendationLoader } from '../hooks/useRecommendations';
import { clearPhotoBoxEntry, readPhotoBoxEntry } from '../lib/photoBoxEntry';
import { applyRecommendation, getApplyDateKey } from '../lib/recommendation';
import { BundleSelectContext, type BundleSelectValue } from './bundleSelectContext';

const notify = (message: string) => toast(message);

type BundleSelectProviderProps = {
  children: ReactNode;
  /** 처음부터 추가돼 있는 멤버 id(테스트·스토리용). 기본은 없음 */
  initialMemberIds?: readonly string[] | undefined;
};

/**
 * 번들 만들기 흐름(멤버 선택 → 사진 선택 → 추천 번들 시트 → 상세 → 뷰어)의 상태를 route layout에서 한 번 들고 있는 provider
 * 상세·뷰어로 이동해도 고른 사진과 시트 열림이 유지되고, 이 흐름을 벗어나면 함께 사라져 선택을 버림(기획 4.1)
 * 사진은 사진함 API, 추천 번들은 추천 번들 목록·상세 API(시트를 열 때와 카드를 눌러 적용할 때마다 최신을 받음), 「번들 만들기」는 초안 생성 API
 */
export function BundleSelectProvider({
  children,
  initialMemberIds = [],
}: BundleSelectProviderProps) {
  const { state: photoState, retry } = usePhotoBox();
  const { create: createBundle, creating } = useCreateBundle();
  const { loadList, loadDetail } = useRecommendationLoader();
  const backOr = useBackOr();
  const photos = photoState.kind === 'ready' ? photoState.data.photos : undefined;

  // 사진함 선택 모드에서 넘어왔으면 그 사진이 처음부터 선택돼 있고, 멤버만 고르면 바로 초안을 만듦(기능 spec 3.3.4)
  const [fromPhotoBox] = useState(() => readPhotoBoxEntry() !== undefined);
  const [selection, setSelection] = useState<PhotoSelection>(() => [
    ...(readPhotoBoxEntry() ?? []),
  ]);
  // 이 흐름을 벗어나면 넘겨받은 사진을 비워 다음 진입에 남지 않게 함
  useEffect(() => clearPhotoBoxEntry, []);
  const [memberIds, setMemberIds] = useState<readonly string[]>(initialMemberIds);
  const [memberId, setMemberId] = useState<string>(ALL_MEMBERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  // 마지막으로 적용한 추천 번들(초안 생성 요청에 함께 보냄, 기능 명세 4.2.4)
  const [appliedId, setAppliedId] = useState<string | undefined>(undefined);
  // 같은 요청을 연달아 눌러도 한 번만 받음(ref는 같은 틱의 중복을, state는 화면 로딩을 맡음)
  const applying = useRef(false);
  const [recommendationBusy, setRecommendationBusy] = useState(false);
  // 응답을 기다리는 사이 사용자가 고른 사진도 반영해 판단하도록 최신 선택을 ref로 둠
  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  });
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
  const commit = (detail: RecommendationDetail) => {
    const next = applyRecommendation(detail);
    setSelection(next);
    setAppliedId(detail.id);
    // 필터가 걸려 있으면 고른 사진이 목록에서 가려질 수 있어 「전체」로 되돌림
    setMemberId(ALL_MEMBERS);
    const dateKey = getApplyDateKey(detail);
    if (dateKey) {
      nonce.current += 1;
      setScrollTarget({ dateKey, nonce: nonce.current });
    }
    notify(BUNDLE_SELECT_MESSAGES.applied(next.length));
  };

  // 서버에서 최신 사진을 받아 옴. 삭제됐으면(사진이 모두 사라진 경우 포함) 기존 선택은 두고 안내만 함
  const fetchApplicable = async (id: string) => {
    const result = await loadDetail(id);
    if (result.kind === 'failed') {
      notify(BUNDLE_SELECT_MESSAGES.applyFailed);
      return { kind: 'failed' } as const;
    }
    if (result.kind === 'deleted' || result.data.photos.length === 0) {
      notify(BUNDLE_SELECT_MESSAGES.deletedRecommendation);
      return { kind: 'deleted' } as const;
    }
    return result;
  };

  // 카드를 누르면 바로 적용(Figma 시트에는 「적용하기」 버튼이 없음)
  const pickRecommendation = async (id: string) => {
    if (applying.current) return 'failed' as const;
    applying.current = true;
    setRecommendationBusy(true);
    try {
      const loaded = await fetchApplicable(id);
      if (loaded.kind !== 'ready') return loaded.kind;
      // 성공한 카드만 선택 모양으로 남김(삭제·실패한 카드가 시트를 다시 열 때 선택돼 보이지 않게)
      setPickedId(id);
      // 이미 고른 사진이 있으면 뒤의 시트를 내리고 변경 확인(기획 4.2.4), 받는 사이 고른 사진도 셈
      if (selectionRef.current.length > 0) return 'confirm' as const;
      commit(loaded.data);
      return 'applied' as const;
    } finally {
      applying.current = false;
      setRecommendationBusy(false);
    }
  };

  // 변경 확인 창이 떠 있는 사이 추천이 바뀔 수 있어 「변경하기」를 누르면 한 번 더 최신 사진을 받음
  const confirmChange = async (id: string) => {
    if (applying.current) return 'failed' as const;
    applying.current = true;
    setRecommendationBusy(true);
    try {
      const loaded = await fetchApplicable(id);
      if (loaded.kind !== 'ready') return loaded.kind;
      commit(loaded.data);
      return 'applied' as const;
    } finally {
      applying.current = false;
      setRecommendationBusy(false);
    }
  };

  // 시트를 열 때마다 최신 목록을 받음. 받지 못하면 시트를 열지 않고 안내
  const loadRecommendations = async () => {
    // 이미 받는 중이면 같은 요청을 또 보내거나 시트를 두 겹으로 올리지 않음
    if (applying.current) return undefined;
    applying.current = true;
    setRecommendationBusy(true);
    try {
      const result = await loadList();
      if (result.kind === 'ready') return result.data;
      notify(BUNDLE_SELECT_MESSAGES.recommendationsFailed);
      return undefined;
    } finally {
      applying.current = false;
      setRecommendationBusy(false);
    }
  };

  // 사진함에서 넘어온 흐름은 사진을 다시 고를 화면이 없어, 모두 사라졌으면 사진함으로 돌려보냄(기능 spec 3.3.4)
  const backToPhotoBox = () => {
    notify(BUNDLE_SELECT_MESSAGES.allSelectionGone);
    backOr(PHOTO_BOX_PATHS.list);
  };

  // 실행 직전 고른 사진이 사진함에서 사라졌는지 확인하고, 사라졌으면 선택에서 빼고 중단(기획 4.1.3)
  // 사진함에서 넘어온 흐름은 안내 없이 남은 사진으로 바로 만들고, 하나도 안 남았으면 사진함으로 돌아감
  const create = () => {
    if (creating || selection.length === 0 || !photos) return;
    const { selection: kept, removedCount } = pruneSelection(
      selection,
      new Set(photos.map((photo) => photo.id)),
    );
    if (removedCount > 0) {
      setSelection(kept);
      if (!fromPhotoBox) {
        notify(BUNDLE_SELECT_MESSAGES.selectionStale(removedCount));
        return;
      }
      if (kept.length === 0) return backToPhotoBox();
    }
    const photoIds = removedCount > 0 ? kept : selection;
    // 번치에서 나간 멤버는 참여자로 보내지 않음(서버가 유효하지 않은 멤버가 하나라도 있으면 전부 거절함)
    const currentMemberIds =
      photoState.kind === 'ready'
        ? photoState.data.members
            .filter((member) => member.id !== photoState.data.viewer.memberId)
            .map((member) => member.id)
        : [];
    const participantIds = memberIds.filter((id) => currentMemberIds.includes(id));
    if (participantIds.length === 0) return;
    createBundle(photoIds, participantIds, {
      // 서버에 없다고 돌려준 사진은 선택에서 빼고 다시 고르게 함(사진함에서 넘어온 흐름은 하나도 안 남으면 사진함으로)
      onMissingPhotos: (missing) => {
        const left = photoIds.filter((id) => !missing.includes(id));
        setSelection(left);
        if (fromPhotoBox && left.length === 0) backToPhotoBox();
      },
      replace: fromPhotoBox,
      recommendationId: appliedId,
    });
  };

  const value: BundleSelectValue = {
    photoState,
    retry,
    selection,
    selectedCounts,
    memberIds,
    memberId,
    sheetOpen,
    pickedId,
    scrollTarget,
    creating,
    recommendationBusy,
    fromPhotoBox,
    clearScrollTarget,
    setMemberId,
    toggleMember,
    toggle,
    openSheet,
    closeSheet,
    loadRecommendations,
    pickRecommendation,
    confirmChange,
    create,
  };

  return <BundleSelectContext.Provider value={value}>{children}</BundleSelectContext.Provider>;
}
