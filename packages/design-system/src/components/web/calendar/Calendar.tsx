import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { LineChevronLeftLargeIcon, LineChevronRightLargeIcon } from '../../../icons';
import { cn } from '../../../utils';
import { CalendarItem } from '../calendarItem';
import { IconButton } from '../iconButton';

const DEFAULT_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/** 달을 옮기되 도착한 달에 같은 날이 없으면 그 달의 마지막 날로 맞춤 */
const addMonths = (date: Date, months: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), last));
};
const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const isSameDay = (a: Date, b: Date) => isSameMonth(a, b) && a.getDate() === b.getDate();
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export type CalendarProps = Omit<
  ComponentProps<'div'>,
  'children' | 'onSelect' | 'defaultValue'
> & {
  /** 선택된 날짜 */
  selected?: Date | null | undefined;
  /** 날짜를 눌렀을 때(선택 값의 보관은 호출하는 쪽 담당) */
  onSelectDate?: ((_date: Date) => void) | undefined;
  /** 처음 보여 줄 달(없으면 선택된 날짜의 달, 그것도 없으면 오늘이 있는 달) */
  defaultMonth?: Date | undefined;
  /** 보이는 달이 바뀔 때(각 달의 1일) */
  onMonthChange?: ((_month: Date) => void) | undefined;
  /** 이 날짜보다 이른 날은 고를 수 없음 */
  minDate?: Date | undefined;
  /** 이 날짜보다 늦은 날은 고를 수 없음 */
  maxDate?: Date | undefined;
  /** 고를 수 없는 날을 더 정할 때 */
  isDateDisabled?: ((_date: Date) => boolean) | undefined;
  /** 일요일부터 시작하는 요일 글자 7개(기본은 Figma의 Su~Sa) */
  weekdayLabels?: readonly string[] | undefined;
  /** 이전 달 화살표의 접근성 이름 */
  previousMonthLabel?: string | undefined;
  /** 다음 달 화살표의 접근성 이름 */
  nextMonthLabel?: string | undefined;
  /** 제목 글자(기본 "2026년 10월", 월은 1~12) */
  formatMonth?: ((_year: number, _month: number) => string) | undefined;
  /** 날짜 버튼의 접근성 이름(기본 "2026년 10월 20일") */
  formatDate?: ((_date: Date) => string) | undefined;
};

const defaultFormatMonth = (year: number, month: number) => `${year}년 ${month}월`;
const defaultFormatDate = (date: Date) =>
  `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;

/**
 * 한 달 날짜 선택 캘린더(Figma `Calender`): 달 이동 화살표, 요일 줄, 날짜 격자
 * 날짜는 `role="grid"`로 읽히고 방향키·Home·End·PageUp·PageDown으로 옮길 수 있으며 `className`은 캘린더에 적용
 */
export const Calendar = ({
  selected = null,
  onSelectDate,
  defaultMonth,
  onMonthChange,
  minDate,
  maxDate,
  isDateDisabled,
  weekdayLabels = DEFAULT_WEEKDAYS,
  previousMonthLabel = '이전 달',
  nextMonthLabel = '다음 달',
  formatMonth = defaultFormatMonth,
  formatDate = defaultFormatDate,
  className,
  ...props
}: CalendarProps) => {
  const titleId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = defaultMonth ?? selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, row) =>
    cells.slice(row * 7, row * 7 + 7),
  );

  const isDisabled = (date: Date) =>
    (minDate !== undefined && date < startOfDay(minDate)) ||
    (maxDate !== undefined && date > startOfDay(maxDate)) ||
    isDateDisabled?.(date) === true;

  // 키보드로 들어갈 날짜는 마지막으로 옮긴 날, 없으면 선택된 날, 없으면 그 달 1일
  const tabbable =
    focusedDate !== null && isSameMonth(focusedDate, viewMonth)
      ? focusedDate
      : selected !== null && isSameMonth(selected, viewMonth)
        ? selected
        : new Date(year, month, 1);

  const changeMonth = (next: Date) => {
    const first = new Date(next.getFullYear(), next.getMonth(), 1);
    setViewMonth(first);
    onMonthChange?.(first);
  };

  const moveFocus = (next: Date) => {
    shouldFocus.current = true;
    setFocusedDate(next);
    if (!isSameMonth(next, viewMonth)) changeMonth(next);
  };

  useEffect(() => {
    if (!shouldFocus.current || focusedDate === null) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${dateKey(focusedDate)}"]`)?.focus();
  }, [focusedDate, viewMonth]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>, date: Date) => {
    // 브라우저·운영체제 단축키(Alt+방향키 등)는 가로채지 않음
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const step: Record<string, Date> = {
      ArrowLeft: addDays(date, -1),
      ArrowRight: addDays(date, 1),
      ArrowUp: addDays(date, -7),
      ArrowDown: addDays(date, 7),
      Home: addDays(date, -date.getDay()),
      End: addDays(date, 6 - date.getDay()),
      PageUp: addMonths(date, event.shiftKey ? -12 : -1),
      PageDown: addMonths(date, event.shiftKey ? 12 : 1),
    };
    const next = step[event.key];
    if (next === undefined) return;
    event.preventDefault();
    moveFocus(next);
  };

  return (
    <div
      className={cn(
        'bg-surface-primary px-padding-p8 gap-s12 flex w-full flex-col items-center',
        className,
      )}
      {...props}
    >
      <div className="flex w-full items-center">
        <IconButton
          aria-label={previousMonthLabel}
          onClick={() => changeMonth(addMonths(viewMonth, -1))}
        >
          <LineChevronLeftLargeIcon />
        </IconButton>
        <div
          id={titleId}
          aria-live="polite"
          className="typography-heading-2-semibold text-text-primary flex-1 text-center"
        >
          {formatMonth(year, month + 1)}
        </div>
        <IconButton
          aria-label={nextMonthLabel}
          onClick={() => changeMonth(addMonths(viewMonth, 1))}
        >
          <LineChevronRightLargeIcon />
        </IconButton>
      </div>
      <div ref={gridRef} role="grid" aria-labelledby={titleId} className="w-80.5">
        <div role="row" className="flex">
          {weekdayLabels.slice(0, 7).map((label, index) => (
            <div
              key={index}
              role="columnheader"
              className="typography-body-3-regular text-text-tertiary flex w-11.5 shrink-0 items-center justify-center"
            >
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, row) => (
          <div key={row} role="row" className="flex">
            {week.map((day, column) => {
              if (day === null) {
                return (
                  <div key={`empty-${column}`} role="gridcell">
                    <CalendarItem hidden />
                  </div>
                );
              }
              const date = new Date(year, month, day);
              const isSelected = selected !== null && isSameDay(selected, date);
              return (
                <div key={dateKey(date)} role="gridcell" aria-selected={isSelected}>
                  <CalendarItem
                    data-date={dateKey(date)}
                    aria-label={formatDate(date)}
                    selected={isSelected}
                    disabled={isDisabled(date)}
                    tabIndex={isSameDay(date, tabbable) ? 0 : -1}
                    onKeyDown={(event) => handleKeyDown(event, date)}
                    onClick={() => {
                      setFocusedDate(date);
                      onSelectDate?.(date);
                    }}
                  >
                    {day}
                  </CalendarItem>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
