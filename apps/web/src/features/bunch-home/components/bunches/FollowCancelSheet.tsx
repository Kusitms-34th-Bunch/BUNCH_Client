'use client';

import { ConfirmSheet, ProfileImage } from '@app/design-system/web';
import type { ScreenOverlayProps } from '@/shared/hooks/useScreenOverlay';

type FollowCancelSheetProps = ScreenOverlayProps & {
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
  bunchName,
  bunchImageSrc,
  status,
  question,
  confirmLabel,
  onConfirm,
  ...rootProps
}: FollowCancelSheetProps) {
  return (
    <ConfirmSheet
      {...rootProps}
      title={
        <>
          {bunchName}
          <span className="sr-only"> {question}</span>
        </>
      }
      description={status}
      // Figma 3213:76794: 92px 자리에 상대 번치 이미지
      illustration={<ProfileImage src={bunchImageSrc} className="size-full" />}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
    />
  );
}
