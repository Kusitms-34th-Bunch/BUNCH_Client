'use client';

import { createContext, useContext } from 'react';
import type { PhotoSelection } from '@/features/photo-box/lib/selection';
import type { PhotoBoxState } from '@/features/photo-box/lib/types';
import type { Recommendation } from '../lib/recommendation';

export type BundleSelectValue = {
  /** 사진함 목록(번들에 담을 사진의 출처) */
  photoState: PhotoBoxState;
  /** 오류 화면의 「다시 시도」 */
  retry: () => void;
  recommendations: readonly Recommendation[];
  /** 누른 순서대로 담은 선택한 사진 id */
  selection: PhotoSelection;
  selectedCounts: Readonly<Record<string, number>>;
  memberId: string;
  /** 추천 번들 시트가 열려 있는지(상세·뷰어를 다녀와도 유지) */
  sheetOpen: boolean;
  /** 시트에서 고른 추천 번들 id */
  pickedId: string | undefined;
  /** 「추천 번들 사진으로 변경할까요?」 확인 창이 열려 있는지 */
  changeOpen: boolean;
  /** 적용 뒤 스크롤할 날짜 섹션(요청마다 nonce가 바뀜) */
  scrollTarget: { dateKey: string; nonce: number } | undefined;
  creating: boolean;
  /** 스크롤을 마친 뒤 대상을 비움(상세·뷰어를 다녀와 다시 마운트돼도 되풀이하지 않음) */
  clearScrollTarget: () => void;
  setMemberId: (_memberId: string) => void;
  toggle: (_photoId: string) => void;
  openSheet: () => void;
  closeSheet: () => void;
  togglePicked: (_recommendationId: string) => void;
  apply: () => void;
  confirmChange: () => void;
  cancelChange: () => void;
  create: () => void;
};

export const BundleSelectContext = createContext<BundleSelectValue | undefined>(undefined);

export function useBundleSelect(): BundleSelectValue {
  const value = useContext(BundleSelectContext);
  if (!value) throw new Error('useBundleSelect는 BundleSelectProvider 안에서만 쓸 수 있어요.');
  return value;
}
