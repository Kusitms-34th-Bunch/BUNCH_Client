'use client';

import { useState } from 'react';
import { Button } from '../../../core/button';
import { LabeledTextField } from '../../labeledTextField';
import { RadioButton } from '../../radioButton';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type ReportReason = { value: string; label: string };

export type ReportSubmitValue = { reason: string; detail: string };

export type ReportSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 예: `여행가조 번치를 신고해요` */
  title: string;
  /** 부제의 앞부분. 예: `신고하는 번치` */
  targetLabel: string;
  /** 부제의 대상 이름. 예: `퇴근런클럽` */
  targetName: string;
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
  targetLabel,
  targetName,
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
        <BottomSheet.Description>
          {targetLabel}: <span className="text-text-tertiary">{targetName}</span>
        </BottomSheet.Description>
        <BottomSheet.Close />
      </BottomSheet.Header>
      <BottomSheet.Body className="gap-s8 flex flex-col">
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
        {needsDetail ? (
          <LabeledTextField
            title="상세 사유"
            placeholder="신고 이유를 입력해주세요."
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
          />
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
