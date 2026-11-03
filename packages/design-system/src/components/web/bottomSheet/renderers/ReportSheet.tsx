'use client';

import { useState } from 'react';
import { cn } from '../../../../utils';
import { Button } from '../../../core/button';
import { LabeledTextField } from '../../labeledTextField';
import { RadioButton } from '../../radioButton';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

// 기능명세 5.10.7: 상세 사유 최대 200자
const REPORT_DETAIL_MAX_LENGTH = 200;

export type ReportReason = { value: string; label: string };

export type ReportSubmitValue = { reason: string; detail: string };

export type ReportSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 예: `여행가조 번치를 신고할까요?` */
  title: string;
  /** 누구 이름으로 신고하는지. 예: `퇴근런클럽 계정으로 신고해요` */
  description: string;
  reasons: ReportReason[];
  /** 이 사유를 고르면 상세 사유 입력 표시·필수(Figma 07). 없으면 입력칸 없음(Figma 08) */
  detailReasonValue?: string | undefined;
  onSubmit: (_value: ReportSubmitValue) => void;
  /** 제출 중 중복 제출 방지 */
  submitting?: boolean | undefined;
};

// 열 때마다 선택·입력 초기화. 닫히는 중 다시 열어도 초기화되게 열림 전환 시점에 재설정
const ReportBody = ({
  open,
  title,
  description,
  reasons,
  detailReasonValue,
  onSubmit,
  submitting,
}: Omit<ReportSheetProps, Exclude<keyof BottomSheetRootProps, 'open'> | 'children'>) => {
  const [selectedReason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(null);
      setDetail('');
    }
  }
  // 열린 동안 사유 목록이 바뀌어 사라진 선택은 무효
  const reason = reasons.some(({ value }) => value === selectedReason) ? selectedReason : null;
  const needsDetail = reason !== null && reason === detailReasonValue;
  const canSubmit =
    reason !== null && (!needsDetail || detail.trim() !== '') && submitting !== true;

  return (
    <>
      <BottomSheet.Header>
        <BottomSheet.Title>{title}</BottomSheet.Title>
        <BottomSheet.Description>{description}</BottomSheet.Description>
        <BottomSheet.Close />
      </BottomSheet.Header>
      <BottomSheet.Body className="flex flex-col">
        <fieldset className="gap-s2 py-padding-p2 flex min-w-0 flex-col">
          <legend className="sr-only">신고 사유</legend>
          {reasons.map(({ value, label }) => (
            <RadioButton
              key={value}
              name="report-reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
            >
              {label}
            </RadioButton>
          ))}
        </fieldset>
        {/* 상세 사유는 자리가 벌어지며 나타나고 접히며 사라짐(150ms ease-out, 번치 프로필 편집 안내와 같은 방식). 접힌 동안은 초점·낭독에서 뺌 */}
        {detailReasonValue !== undefined ? (
          <div
            aria-hidden={!needsDetail}
            inert={!needsDetail}
            className={cn(
              'grid transition-[grid-template-rows,opacity,visibility] duration-150 ease-out motion-reduce:transition-none',
              needsDetail
                ? 'visible grid-rows-[1fr] opacity-100'
                : 'invisible grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <LabeledTextField
                className="mt-s8"
                title="상세 사유"
                option="required"
                maxLength={REPORT_DETAIL_MAX_LENGTH}
                showCounter={false}
                placeholder="신고 이유를 입력해주세요."
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
              />
            </div>
          </div>
        ) : null}
      </BottomSheet.Body>
      <BottomSheet.Footer>
        <Button
          disabled={!canSubmit}
          onClick={() => {
            if (reason !== null) onSubmit({ reason, detail: needsDetail ? detail.trim() : '' });
          }}
        >
          신고하기
        </Button>
      </BottomSheet.Footer>
    </>
  );
};

/**
 * 신고 사유 선택 시트(Figma Bottom Sheet 07 `2500:48657`·08 `2500:50687`)
 * 입력 중 실수로 닫히지 않게 바깥 터치 닫기 차단. 「신고하기」는 onSubmit만 호출(닫기는 호출자 담당)
 */
export const ReportSheet = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  ...bodyProps
}: ReportSheetProps) => (
  <BottomSheet.Root
    open={open}
    onOpenChange={onOpenChange}
    onOpenChangeComplete={onOpenChangeComplete}
    disablePointerDismissal
  >
    <BottomSheet.Content>
      <ReportBody open={open} {...bodyProps} />
    </BottomSheet.Content>
  </BottomSheet.Root>
);
