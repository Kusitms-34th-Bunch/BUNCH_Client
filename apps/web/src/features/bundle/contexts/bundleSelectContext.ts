'use client';

import { createContext, useContext } from 'react';
import type { PhotoSelection } from '@/features/photo-box/lib/selection';
import type { PhotoBoxState } from '@/features/photo-box/lib/types';
import type { Recommendation } from '../model/recommendation';

export type BundleSelectValue = {
  /** 사진함 목록(번들에 담을 사진의 출처) */
  photoState: PhotoBoxState;
  /** 오류 화면의 「다시 시도」 */
  retry: () => void;
  /** 누른 순서대로 담은 선택한 사진 id */
  selection: PhotoSelection;
  selectedCounts: Readonly<Record<string, number>>;
  /** 함께 만들 멤버 id(나 제외, 추가한 순서). 사진 선택 화면의 멤버 칩 범위 */
  memberIds: readonly string[];
  memberId: string;
  /** 추천 시트를 올려 달라는 요청. 사진 선택 화면이 받아 시트를 열고 비움 */
  sheetOpen: boolean;
  /** 마지막으로 누른 추천 번들 id(시트를 다시 열면 선택 모양으로 보임) */
  pickedId: string | undefined;
  /** 적용 뒤 스크롤할 날짜 섹션(요청마다 nonce가 바뀜) */
  scrollTarget: { dateKey: string; nonce: number } | undefined;
  creating: boolean;
  /** 추천 번들 목록·사진을 서버에서 받는 중(시트가 올라오기 전, 카드를 눌러 적용하기 전). 화면을 막고 로딩을 보임 */
  recommendationBusy: boolean;
  /** 지금 추천 번들을 받는 중인지(시트가 열려 있는 동안의 콜백이 낡은 값을 보지 않게 ref를 읽음) */
  isRecommendationBusy: () => boolean;
  /** 사진함 선택 모드에서 넘어온 흐름(사진은 이미 골랐고 멤버만 고르면 바로 초안을 만듦) */
  fromPhotoBox: boolean;
  /** 스크롤을 마친 뒤 대상을 비움(상세·뷰어를 다녀와 다시 마운트돼도 되풀이하지 않음) */
  clearScrollTarget: () => void;
  setMemberId: (_memberId: string) => void;
  toggleMember: (_memberId: string) => void;
  toggle: (_photoId: string) => void;
  openSheet: () => void;
  closeSheet: () => void;
  /** 서버에서 최신 추천 번들 목록을 받음. 받지 못하면 안내하고 undefined */
  loadRecommendations: () => Promise<readonly Recommendation[] | undefined>;
  /**
   * 추천 번들 카드를 누르면 서버에서 최신 사진을 받아 바로 적용. 고른 사진이 있으면 'confirm'(변경 확인 창을 거침)
   * 추천이 삭제됐으면 안내하고 'deleted'(목록을 다시 받아야 함), 받지 못했으면 안내하고 'failed'
   */
  pickRecommendation: (
    _recommendationId: string,
  ) => Promise<'applied' | 'confirm' | 'deleted' | 'failed'>;
  /** 변경 확인 창에서 「변경하기」를 눌렀을 때 서버에서 최신 사진을 다시 받아 적용. 삭제됐으면 'deleted' */
  confirmChange: (_recommendationId: string) => Promise<'applied' | 'deleted' | 'failed'>;
  create: () => void;
};

export const BundleSelectContext = createContext<BundleSelectValue | undefined>(undefined);

export function useBundleSelect(): BundleSelectValue {
  const value = useContext(BundleSelectContext);
  if (!value) throw new Error('useBundleSelect는 BundleSelectProvider 안에서만 쓸 수 있어요.');
  return value;
}
