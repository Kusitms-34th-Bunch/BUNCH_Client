'use client';

import type { ReactNode } from 'react';
import type { BottomSheetRootProps } from '../BottomSheet';
import { ConfirmSheet } from './ConfirmSheet';

export type AdminTransferSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 관리자로 지정할 멤버 이름(제목·부제에 사용) */
  memberName: string;
  onConfirm: () => void;
  /** 처리 중 중복 실행 방지 */
  confirming?: boolean | undefined;
  /** 제목 위 그림(Figma 92px 자리. 디자인 에셋 전달 전이라 호출자가 지정) */
  illustration?: ReactNode;
};

/**
 * 관리자 지정 후 나가기 확인 시트(Figma Bottom Sheet 05, `2487:46352`). `ConfirmSheet`에 문구를 채운 것
 * 「취소」는 닫기 요청, 「지정하고 나가기」는 onConfirm만 호출(닫기는 호출자 담당)
 */
export const AdminTransferSheet = ({ memberName, ...props }: AdminTransferSheetProps) => (
  <ConfirmSheet
    {...props}
    title={`${memberName}님을 관리자로 지정하고 나갈까요?`}
    description={`${memberName}님이 번치 관리와 번들 발행 권한을 갖게 돼요.`}
    notice={
      '나가면 해당 번치에 더 이상 접근할 수 없어요.\n함께 남긴 사진과 발행된 번들은 번치에 그대로 남아요.'
    }
    confirmLabel="지정하고 나가기"
  />
);
