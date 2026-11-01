'use client';

import { Button } from '@app/design-system';
import { BottomSheet, SuggestedBundleCard } from '@app/design-system/web';
import type { Recommendation } from '../lib/recommendation';
import { BUNDLE_SELECT_MESSAGES, MAX_RECOMMEND_CHIPS } from '../constants/selectMessages';

type RecommendSheetProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  recommendations: readonly Recommendation[];
  /** 고른 추천 번들 id(하나만, 다시 누르면 해제) */
  pickedId: string | undefined;
  onPick: (_recommendationId: string) => void;
  /** 카드의 「>」: 상세로 이동(고른 카드는 바꾸지 않음) */
  onDetail: (_recommendationId: string) => void;
  onApply: () => void;
};

/**
 * 추천 번들 시트(Figma `2060:38722`·`38780`·빈 상태 `2121:37628`): 거의 전체 높이의 회색 시트에 2줄 제목, 카드 목록, 하단 고정 「적용하기」
 * 카드를 하나 고르기 전에는 「적용하기」가 비활성이고, 추천이 없으면 제목·버튼 없이 빈 상태만 보임
 * 아래로 끌거나 바깥을 눌러 닫아도 화면의 사진 선택은 그대로(적용만 선택을 바꿈)
 */
export function RecommendSheet({
  open,
  onOpenChange,
  recommendations,
  pickedId,
  onPick,
  onDetail,
  onApply,
}: RecommendSheetProps) {
  const empty = recommendations.length === 0;

  return (
    <BottomSheet.Root open={open} onOpenChange={onOpenChange}>
      <BottomSheet.Content className="bg-surface-secondary h-[calc(100dvh-var(--safe-area-top,env(safe-area-inset-top,0px))-var(--spacing-s12))]">
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
          <BottomSheet.Body className="gap-s3 flex flex-col items-center justify-center text-center">
            {/* Figma는 이 자리에 회색 사각형(일러스트 자리표시)만 있어 같은 크기의 장식 블록으로 둠 */}
            <div aria-hidden="true" className="bg-surface-tertiary mb-s4 size-28" />
            <p className="typography-body-1-semi-bold text-text-quaternary">
              {BUNDLE_SELECT_MESSAGES.emptyTitle}
            </p>
            <p className="typography-body-3-regular text-text-quaternary">
              {BUNDLE_SELECT_MESSAGES.emptyDescription}
            </p>
          </BottomSheet.Body>
        ) : (
          <>
            <BottomSheet.Body>
              <ul className="gap-s7 flex flex-col pb-4">
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
            <BottomSheet.Footer>
              <Button disabled={pickedId === undefined} onClick={onApply}>
                {BUNDLE_SELECT_MESSAGES.apply}
              </Button>
            </BottomSheet.Footer>
          </>
        )}
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
