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
  /** 카드 오른쪽 화살표로 상세 이동(화살표가 항상 보여서 필수) */
  onOpenDetail: (_id: string) => void;
  /** 카드에 보일 멤버 칩 최대 개수. 기본은 `SuggestedBundleCard` 기본값 */
  maxVisibleMembers?: number | undefined;
  /** 추천이 없을 때 시트 이름(보이지 않음)·문구 */
  emptyLabel: string;
  emptyTitle: string;
  emptyDescription: string;
};

/**
 * 추천 번들 목록 시트(Figma `5664:100243`·`5664:100535`): 거의 전체 높이의 회색 시트에 2줄 제목과 `SuggestedBundleCard` 목록
 * 목록이 길면 본문만 스크롤하고, 추천이 없으면 제목 없이 빈 상태만 보임(Figma `4744:89611`)
 */
export const BundleRecommendSheet = ({
  bundles,
  selectedId,
  onSelect,
  onOpenDetail,
  maxVisibleMembers,
  emptyLabel,
  emptyTitle,
  emptyDescription,
  ...rootProps
}: BundleRecommendSheetProps) => {
  const empty = bundles.length === 0;
  return (
    <BottomSheet.Root {...rootProps}>
      <BottomSheet.Content className="bg-surface-secondary h-[calc(100dvh-var(--safe-area-top,env(safe-area-inset-top,0px))-var(--spacing-s12))]">
        <BottomSheet.Header>
          {empty ? (
            <BottomSheet.Title className="sr-only">{emptyLabel}</BottomSheet.Title>
          ) : (
            <BottomSheet.Title className="typography-heading-2-semibold">
              추천 사진으로
              <br />
              빠르게 번들을 만들어보세요!
            </BottomSheet.Title>
          )}
          {/* 화면에 닫기 버튼이 없어 스크린 리더·키보드용으로 숨겨 둠 */}
          <BottomSheet.Close className="focus-visible:-m-s5 focus-visible:p-s5 sr-only focus-visible:not-sr-only" />
        </BottomSheet.Header>
        {empty ? (
          // 일러스트 없이 문구만 가운데에 두고, 제목·설명 간격 4
          <BottomSheet.Body className="gap-s2 flex flex-col items-center justify-center text-center">
            <p className="typography-body-1-medium text-text-tertiary">{emptyTitle}</p>
            <p className="typography-body-4-regular text-text-quaternary">{emptyDescription}</p>
          </BottomSheet.Body>
        ) : (
          <BottomSheet.Body>
            <ul className="gap-s7 flex flex-col">
              {bundles.map(({ id, ...bundle }) => (
                <li key={id}>
                  <SuggestedBundleCard
                    {...bundle}
                    maxVisibleMembers={maxVisibleMembers}
                    selected={selectedId === id}
                    onCardClick={() => onSelect(id)}
                    onDetailClick={() => onOpenDetail(id)}
                  />
                </li>
              ))}
            </ul>
          </BottomSheet.Body>
        )}
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
};
