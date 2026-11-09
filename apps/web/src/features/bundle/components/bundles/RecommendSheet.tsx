'use client';

import { BottomSheet, SuggestedBundleCard } from '@app/design-system/web';
import type { Recommendation } from '../../lib/recommendation';
import { BUNDLE_SELECT_MESSAGES, MAX_RECOMMEND_CHIPS } from '../../constants/selectMessages';

type RecommendSheetProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  recommendations: readonly Recommendation[];
  /** 마지막으로 누른 추천 번들 id(선택 모양으로 보임) */
  pickedId: string | undefined;
  /** 카드를 누르면 바로 적용 */
  onPick: (_recommendationId: string) => void;
  /** 카드의 「>」: 상세로 이동(고른 카드는 바꾸지 않음) */
  onDetail: (_recommendationId: string) => void;
};

/**
 * 추천 번들 시트(Figma `5664:100243`·`100535`): 거의 전체 높이의 회색 시트에 2줄 제목과 카드 목록
 * 시안에 「적용하기」 버튼이 없어 카드를 누르면 바로 적용하고, 추천이 없으면 제목 없이 빈 상태만 보임
 * 아래로 끌거나 바깥을 눌러 닫아도 화면의 사진 선택은 그대로(적용만 선택을 바꿈)
 */
export function RecommendSheet({
  open,
  onOpenChange,
  recommendations,
  pickedId,
  onPick,
  onDetail,
}: RecommendSheetProps) {
  const empty = recommendations.length === 0;

  return (
    <BottomSheet.Root open={open} onOpenChange={onOpenChange}>
      <BottomSheet.Content className="bg-surface-secondary relative h-[calc(100dvh-var(--safe-area-top,env(safe-area-inset-top,0px))-var(--spacing-s12))]">
        <BottomSheet.Header>
          <BottomSheet.Title
            className={
              empty
                ? 'sr-only'
                : 'typography-heading-2-semibold text-text-primary whitespace-pre-line'
            }
          >
            {empty ? BUNDLE_SELECT_MESSAGES.sheetLabel : BUNDLE_SELECT_MESSAGES.sheetTitle}
          </BottomSheet.Title>
        </BottomSheet.Header>
        {empty ? (
          // Figma 4744:89611: 일러스트 없이 문구만 가운데에 두고, 제목·설명 간격 4
          <BottomSheet.Body className="gap-s2 flex flex-col items-center justify-center text-center">
            <p className="typography-body-1-medium text-text-tertiary">
              {BUNDLE_SELECT_MESSAGES.emptyTitle}
            </p>
            <p className="typography-body-4-regular text-text-quaternary">
              {BUNDLE_SELECT_MESSAGES.emptyDescription}
            </p>
          </BottomSheet.Body>
        ) : (
          <>
            <BottomSheet.Body>
              <ul className="gap-s7 flex flex-col">
                {recommendations.map((item) => (
                  <li key={item.id}>
                    <SuggestedBundleCard
                      imageSrc={item.imageSrc}
                      title={item.title}
                      members={[...item.memberNames]}
                      photoCount={item.photoIds.length}
                      month={item.month}
                      day={item.day}
                      maxVisibleMembers={MAX_RECOMMEND_CHIPS}
                      selected={pickedId === item.id}
                      onCardClick={() => onPick(item.id)}
                      onDetailClick={() => onDetail(item.id)}
                    />
                  </li>
                ))}
              </ul>
            </BottomSheet.Body>
          </>
        )}
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
