'use client';

import type { ReactNode } from 'react';
import { cn } from '../../../../utils';
import { Button } from '../../../core/button';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type ConfirmSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 확인할 내용(예: `여행가조 번치를 차단할까요?`) */
  title: string;
  /** 제목 아래 짧은 부제(Figma `sub`). 없으면 생략 */
  description?: string | undefined;
  /** 회색 상자의 안내(Figma `discription`). 줄바꿈 유지. 없으면 생략 */
  notice?: string | undefined;
  /** 제목 위 그림(Figma 92px 자리. 호출자가 지정) */
  illustration?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** 처리 중 중복 실행 방지 */
  confirming?: boolean | undefined;
};

const NOTICE_CLASS =
  'bg-surface-secondary rounded-r4 px-padding-p8 py-padding-p7 typography-body-3-regular text-text-tertiary w-full wrap-break-word break-keep whitespace-pre-line';

/**
 * 동작 확인 시트(Figma Bottom Sheet 05, `2487:46352`): 그림·제목·부제·안내 상자 + 「취소」·확인
 * 「취소」는 닫기 요청, 확인은 onConfirm만 호출(닫기는 호출자 담당)
 */
export const ConfirmSheet = ({
  title,
  description,
  notice,
  illustration,
  confirmLabel,
  onConfirm,
  confirming,
  ...rootProps
}: ConfirmSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    <BottomSheet.Content>
      {/* Figma 05: 손잡이 아래 40px(기본 16px + 24px), 가운데 정렬 */}
      <BottomSheet.Body className="gap-s14 mt-s12 flex flex-col items-center text-center">
        <div className="gap-s10 flex flex-col items-center">
          {illustration ? <div className="size-23 shrink-0">{illustration}</div> : null}
          <div className="gap-s1 flex flex-col items-center">
            <BottomSheet.Title className="typography-heading-2-medium">{title}</BottomSheet.Title>
            {description ? (
              <BottomSheet.Description className="typography-caption-1-regular text-text-tertiary mt-0">
                {description}
              </BottomSheet.Description>
            ) : null}
          </div>
        </div>
        {/* 부제가 없으면 안내 상자가 시트 설명(열 때 제목과 함께 읽힘) */}
        {notice ? (
          description ? (
            <p className={NOTICE_CLASS}>{notice}</p>
          ) : (
            <BottomSheet.Description className={cn(NOTICE_CLASS, 'mt-0')}>
              {notice}
            </BottomSheet.Description>
          )
        ) : null}
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
          {confirmLabel}
        </Button>
      </BottomSheet.Footer>
    </BottomSheet.Content>
  </BottomSheet.Root>
);
