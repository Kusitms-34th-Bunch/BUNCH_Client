'use client';

import { SuggestedBundleCard, type SuggestedBundleCardProps } from '../../suggestedBundleCard';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type BundleRecommendItem = Pick<
  SuggestedBundleCardProps,
  'imageSrc' | 'title' | 'members' | 'photoCount' | 'month' | 'day'
> & { id: string };

export type BundleRecommendSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  bundles: BundleRecommendItem[];
  /** 선택된 추천 번들 */
  selectedId?: string | null | undefined;
  /** 카드 선택(선택 상태 보관은 호출자 담당) */
  onSelect: (_id: string) => void;
  /** 카드 오른쪽 화살표로 상세 이동 */
  onOpenDetail?: ((_id: string) => void) | undefined;
};

/**
 * 추천 번들 목록 시트(Figma Bottom Sheet 03, `2487:46354`): 회색 배경 위 `SuggestedBundleCard` 목록
 * 목록이 길면 본문만 스크롤. 「적용하기」 등 선택 반영 버튼은 Figma에 없어 미포함
 */
export const BundleRecommendSheet = ({
  bundles,
  selectedId,
  onSelect,
  onOpenDetail,
  ...rootProps
}: BundleRecommendSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content className="bg-surface-secondary gap-s7">
      <BottomSheet.Header className="pt-padding-p7">
        <BottomSheet.Title className="typography-heading-2-semibold">
          추천 사진으로
          <br />
          빠르게 번들을 만들어보세요!
        </BottomSheet.Title>
        <BottomSheet.Close className="focus-visible:-m-s5 focus-visible:p-s5 sr-only focus-visible:not-sr-only" />
      </BottomSheet.Header>
      <BottomSheet.Body className="gap-s7 pb-s8 flex flex-col">
        {bundles.map(({ id, ...bundle }) => (
          <SuggestedBundleCard
            key={id}
            {...bundle}
            className="shrink-0"
            selected={selectedId === id}
            onCardClick={() => onSelect(id)}
            onDetailClick={onOpenDetail ? () => onOpenDetail(id) : undefined}
          />
        ))}
      </BottomSheet.Body>
    </BottomSheet.Content>
  </BottomSheet.Root>
);
