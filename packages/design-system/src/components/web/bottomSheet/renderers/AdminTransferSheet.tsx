'use client';

import type { ReactNode } from 'react';
import { Button } from '../../../core/button';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

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
 * 관리자 지정 후 나가기 확인 시트(Figma Bottom Sheet 05, `2487:46352`)
 * 「취소」는 닫기 요청, 「지정하고 나가기」는 onConfirm만 호출(닫기는 호출자 담당)
 */
export const AdminTransferSheet = ({
  memberName,
  onConfirm,
  confirming,
  illustration,
  ...rootProps
}: AdminTransferSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content>
      {/* Figma 05: 손잡이 아래 40px(기본 16px + 24px), 가운데 정렬 */}
      <BottomSheet.Body className="gap-s14 mt-s12 flex flex-col items-center text-center">
        <div className="gap-s10 flex flex-col items-center">
          {illustration ? <div className="size-23 shrink-0">{illustration}</div> : null}
          <div className="gap-s1 flex flex-col items-center">
            <BottomSheet.Title className="typography-heading-2-medium">
              {memberName}님을 관리자로 지정하고 나갈까요?
            </BottomSheet.Title>
            <BottomSheet.Description className="typography-caption-1-regular text-text-tertiary mt-0">
              {memberName}님이 번치 관리와 번들 발행 권한을 갖게 돼요.
            </BottomSheet.Description>
          </div>
        </div>
        <p className="bg-surface-secondary rounded-r4 px-padding-p8 py-padding-p7 typography-body-3-regular text-text-tertiary w-full wrap-break-word break-keep">
          나가면 해당 번치에 더 이상 접근할 수 없어요.
          <br />
          함께 남긴 사진과 발행된 번들은 번치에 그대로 남아요.
        </p>
      </BottomSheet.Body>
      <BottomSheet.Footer className="flex-row">
        <Button
          variant="tertiary"
          className="min-w-0 flex-1"
          onClick={() => rootProps.onOpenChange(false)}
        >
          취소
        </Button>
        <Button
          variant="primary"
          className="min-w-0 flex-1"
          disabled={confirming}
          onClick={onConfirm}
        >
          지정하고 나가기
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  </BottomSheet.Root>
);
