'use client';

import { Button } from '@app/design-system';
import { BottomSheet, ProfileImage } from '@app/design-system/web';

type FollowCancelSheetProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  bunchName: string;
  bunchImageSrc?: string | undefined;
  /** 이름 아래 상태 문구(예: 「비공개 번치」, 「요청 대기 중인 비공개 번치」) */
  status: string;
  /** 제목 뒤에 읽히는 질문(보이지 않음). 「취소」와 실행 버튼만으로는 무슨 확인인지 알 수 없어서 */
  question: string;
  /** 오른쪽 버튼(「팔로우 취소」·「팔로우 요청 취소」) */
  confirmLabel: string;
  /** 닫기는 호출자 담당 */
  onConfirm: () => void;
};

/**
 * 팔로우 취소·팔로우 요청 취소 확인 시트(화면설계서 2500:68583 3·4번, Figma Bottom Sheet 05 모양)
 * 상대 번치 이미지·이름·상태 문구, 「취소」/확인 버튼
 */
export function FollowCancelSheet({
  open,
  onOpenChange,
  bunchName,
  bunchImageSrc,
  status,
  question,
  confirmLabel,
  onConfirm,
}: FollowCancelSheetProps) {
  return (
    <BottomSheet.Root open={open} onOpenChange={onOpenChange}>
      <BottomSheet.Content>
        {/* 손잡이 아래 40px(기본 16px + 24px), 이미지 92px과 이름 사이 20px(Figma 3213:76794) */}
        <BottomSheet.Body className="gap-s10 mt-s12 flex flex-col items-center text-center">
          <ProfileImage src={bunchImageSrc} className="size-23" />
          <div className="gap-s1 flex flex-col items-center">
            <BottomSheet.Title className="typography-heading-2-medium">
              {bunchName}
              <span className="sr-only"> {question}</span>
            </BottomSheet.Title>
            <BottomSheet.Description className="typography-caption-1-regular text-text-tertiary mt-0">
              {status}
            </BottomSheet.Description>
          </div>
        </BottomSheet.Body>
        <BottomSheet.Footer className="flex-row">
          <Button variant="tertiary" className="min-w-0 flex-1" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button variant="primary" className="min-w-0 flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </BottomSheet.Footer>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
