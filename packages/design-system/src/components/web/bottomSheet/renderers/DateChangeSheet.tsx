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
  /**
   * 처음 고른 상태로 보여 줄 날짜(그 달을 먼저 보임). 없으면 오늘 달을 선택 없이 엶
   * 처음 선택 상태는 화면 명세마다 달라서 호출하는 쪽이 정함(사진 상세는 사진의 촬영 날짜)
   * 이 날짜 그대로는 저장할 수 없고 다른 날짜를 골라야 「저장」이 켜짐
   */
  defaultDate?: Date | null | undefined;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// 열 때마다 처음 상태로 돌림: 기본은 오늘 달·선택 없음(기능명세 3.4.1), `defaultDate`가 있으면 그 날짜 선택
// 닫히는 중 다시 열어도 초기화되게 열림 전환 시점에 재설정
const DateChangeBody = ({
  open,
  onSave,
  saving,
  defaultDate,
}: Pick<DateChangeSheetProps, 'open' | 'onSave' | 'saving' | 'defaultDate'>) => {
  const hintId = useId();
  const [today, setToday] = useState(() => new Date());
  const initialDate = defaultDate ? startOfDay(defaultDate) : null;
  const [selected, setSelected] = useState<Date | null>(initialDate);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setToday(new Date());
      setSelected(initialDate);
    }
  }
  const changed = selected !== null && (initialDate === null || !isSameDay(selected, initialDate));
  const canSave = changed && saving !== true;
  const hint =
    saving === true
      ? '저장 중이에요'
      : initialDate === null
        ? '날짜를 고르면 저장할 수 있어요'
        : '다른 날짜를 고르면 저장할 수 있어요';

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
          {hint}
        </span>
      </BottomSheet.Header>
      <BottomSheet.Body className="px-0">
        <Calendar
          defaultMonth={initialDate ?? today}
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
export const DateChangeSheet = ({
  onSave,
  saving,
  defaultDate,
  ...rootProps
}: DateChangeSheetProps) => (
  <BottomSheet.Root {...rootProps}>
    {/* Figma 02: 손잡이 없음, 위 14px, 닫기 왼쪽·「저장」 오른쪽 */}
    <BottomSheet.Content handle={false} className="pt-padding-p7">
      <DateChangeBody
        open={rootProps.open}
        onSave={onSave}
        saving={saving}
        defaultDate={defaultDate}
      />
    </BottomSheet.Content>
  </BottomSheet.Root>
);
