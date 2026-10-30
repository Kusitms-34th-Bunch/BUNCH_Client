'use client';

import { useId, useState } from 'react';
import { TextButton } from '../../../core/textButton';
import { Calendar } from '../../calendar';
import { BottomSheet, type BottomSheetRootProps } from '../BottomSheet';

export type DateChangeSheetProps = Omit<
  BottomSheetRootProps,
  'children' | 'disablePointerDismissal'
> & {
  /** 「저장」 시 고른 날짜(그날 0시, 기기 시간대)로 호출. 저장·닫기·오류 안내는 호출자 담당 */
  onSave: (_date: Date) => void;
  /** 저장 중 중복 저장 방지 */
  saving?: boolean | undefined;
};

// 열 때마다 오늘 달·선택 없음(기능명세 3.4.1). 닫히는 중 다시 열어도 초기화되게 열림 전환 시점에 재설정
const DateChangeBody = ({
  open,
  onSave,
  saving,
}: Pick<DateChangeSheetProps, 'open' | 'onSave' | 'saving'>) => {
  const hintId = useId();
  const [today, setToday] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setToday(new Date());
      setSelected(null);
    }
  }
  const canSave = selected !== null && saving !== true;

  return (
    <>
      <BottomSheet.Header className="items-center">
        <BottomSheet.Title className="sr-only">날짜 바꾸기</BottomSheet.Title>
        <BottomSheet.Close className="col-start-1 row-span-1 justify-self-start" />
        {/* disabled 대신 aria-disabled: 초점 유지와 비활성 이유 안내 */}
        <TextButton
          variant="primary"
          size="md"
          aria-disabled={!canSave}
          aria-describedby={canSave ? undefined : hintId}
          className="aria-disabled:text-text-disabled col-start-2 row-start-1 aria-disabled:cursor-not-allowed aria-disabled:before:hidden"
          onClick={() => {
            if (canSave) onSave(selected);
          }}
        >
          저장
        </TextButton>
        <span id={hintId} className="sr-only">
          {saving === true ? '저장 중이에요' : '날짜를 고르면 저장할 수 있어요'}
        </span>
      </BottomSheet.Header>
      <BottomSheet.Body className="px-0">
        <Calendar
          defaultMonth={today}
          maxDate={today}
          selected={selected}
          onSelectDate={setSelected}
        />
      </BottomSheet.Body>
    </>
  );
};

/**
 * 사진 촬영 날짜 변경 시트(Figma Bottom Sheet 02, `2487:46355`)
 * 오늘 이후 선택 불가, 날짜 선택 전 「저장」 비활성
 */
export const DateChangeSheet = ({ onSave, saving, ...rootProps }: DateChangeSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    {/* Figma 02: 손잡이 없음, 위 14px, 닫기 왼쪽·「저장」 오른쪽 */}
    <BottomSheet.Content handle={false} className="pt-padding-p7">
      <DateChangeBody open={rootProps.open} onSave={onSave} saving={saving} />
    </BottomSheet.Content>
  </BottomSheet.Root>
);
