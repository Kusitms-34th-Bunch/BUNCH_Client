import { Popover } from '@base-ui/react/popover';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../../utils';
import { Calendar } from '../../core/calendar';
import { useKeyboardFocusWithin } from '../keyboardFocus.internal';
import { parseDateInput } from './DatePickerField.internal';

// 보이는 라벨이 없을 수 있어 이름 필수
export type DatePickerFieldProps = {
  /** 선택된 날짜(제어 컴포넌트). 없으면 null */
  value: Date | null;
  /** 달력에서 고르거나 입력을 마쳤을 때(비우면 null) */
  onValueChange: (_date: Date | null) => void;
  /** 입력칸에 보일 글자. 시간 등 표시 규칙은 호출자가 정함(기본 `2026.11.25`) */
  formatValue?: ((_date: Date) => string) | undefined;
  /** 선택 전 글자(예: "시작일 선택 또는 입력") */
  placeholder?: string | undefined;
  /** 직접 입력을 해석하지 못해 되돌렸을 때 스크린 리더에 알릴 글자(예: "날짜를 2026.11.25 형식으로 입력해주세요"). 없으면 알림 없이 되돌림 */
  invalidInputMessage?: string | undefined;
  /** 달력 팝업의 접근성 이름(예: "시작일 달력") */
  calendarLabel: string;
  /** 이 날짜보다 이른 날은 고를 수 없음 */
  minDate?: Date | undefined;
  /** 이 날짜보다 늦은 날은 고를 수 없음 */
  maxDate?: Date | undefined;
  /** 고를 수 없는 날을 더 정할 때 */
  isDateDisabled?: ((_date: Date) => boolean) | undefined;
  disabled?: boolean | undefined;
  /** 바깥 상자에 적용(폭은 부모를 채움) */
  className?: string | undefined;
} & ({ 'aria-label': string } | { 'aria-labelledby': string });

const pad = (value: number) => String(value).padStart(2, '0');
const defaultFormatValue = (date: Date) =>
  `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

// Tab 순서에 들어가는 요소만(roving tabindex의 -1, 숨김·inert 안의 요소 제외)
const isTabbable = (element: HTMLElement) =>
  element.tabIndex >= 0 && !element.closest('[inert], [hidden], [aria-hidden="true"]');
const tabbablesIn = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isTabbable);

// Base UI가 포털 앞뒤에 두는 포커스 가드(보이지 않는 span)
const isFocusGuard = (element: Element) =>
  element.tagName === 'SPAN' &&
  element.hasAttribute('data-type') &&
  element.getAttribute('tabindex') === '0';

// 입력칸 다음 Tab 순서의 요소(달력과 포커스 가드는 건너뜀). 달력이 포털에 그려져 Tab 순서가 입력칸 뒤에 오지 않아 직접 찾음
const nextTabbableAfter = (input: HTMLElement, popup: HTMLElement | null) => {
  const candidates = tabbablesIn(document).filter(
    (element) => element === input || (!popup?.contains(element) && !isFocusGuard(element)),
  );
  return candidates[candidates.indexOf(input) + 1] ?? null;
};

// 달력 안에서 Tab으로 닿는 요소(날짜 격자는 roving tabindex라 하나만)
const popupTabbables = (popup: HTMLElement) =>
  tabbablesIn(popup).filter((element) => !isFocusGuard(element));

/**
 * 어드민 날짜 입력칸(Figma `어드민 컴포넌트` > `Date Picker Text Field`): 입력칸 + 펼치는 core `Calendar`, Default·Focused·Selected·Filled
 * 입력칸을 누르면 달력이 열리고 직접 입력도 받음. 입력은 칸을 벗어나거나 Enter일 때 해석하고, 해석할 수 없거나 고를 수 없는 날이면 이전 값으로 되돌림
 * ↓ 키로 달력에 초점 이동, Esc는 입력 중인 글자를 버리고 닫기(Base UI Popover)
 */
export const DatePickerField = ({
  value,
  onValueChange,
  formatValue = defaultFormatValue,
  placeholder,
  invalidInputMessage,
  calendarLabel,
  minDate,
  maxDate,
  isDateDisabled,
  disabled,
  className,
  ...labelProps
}: DatePickerFieldProps) => {
  const [open, setOpen] = useState(false);
  // 입력 중인 글자(입력 중이 아니면 null이고 선택된 날짜의 표시 글자를 보여 줌)
  const [draft, setDraftState] = useState<string | null>(null);
  // 같은 입력을 blur·닫힘이 겹쳐 두 번 확정하지 않게 최신 글자를 ref로도 보관
  const draftRef = useRef<string | null>(null);
  const [notice, setNotice] = useState('');
  const keyboardFocusProps = useKeyboardFocusWithin();
  const anchorRef = useRef<HTMLLabelElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  // 달력을 닫으며 입력칸으로 초점을 되돌릴 때는 다시 열지 않음
  const skipFocusOpenRef = useRef(false);
  // ↓ 키로 열었으면 달력이 그려진 뒤 격자로 초점 이동
  const focusGridRef = useRef(false);
  // 달력 안을 누르는 중(Safari는 버튼 클릭에 relatedTarget이 없어 blur에서 먼저 확정되지 않게)
  const pointerInPopupRef = useRef(false);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const skipTimerRef = useRef<number | undefined>(undefined);

  // 사라질 때 남은 타이머 정리
  useEffect(
    () => () => {
      window.clearTimeout(noticeTimerRef.current);
      window.clearTimeout(skipTimerRef.current);
    },
    [],
  );

  const setDraft = (next: string | null) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const isSelectable = (date: Date) => {
    const day = startOfDay(date).getTime();
    if (minDate && day < startOfDay(minDate).getTime()) return false;
    if (maxDate && day > startOfDay(maxDate).getTime()) return false;
    return !isDateDisabled?.(date);
  };

  const commitDraft = () => {
    const text = draftRef.current;
    if (text === null) return;
    setDraft(null);
    if (text.trim() === '') {
      if (value !== null) onValueChange(null);
      return;
    }
    const parsed = parseDateInput(text);
    if (parsed && isSelectable(parsed)) {
      onValueChange(parsed);
      return;
    }
    // Figma에 오류 모양이 없어 화면은 이전 값으로 되돌리고 스크린 리더에만 알림
    // 같은 글자를 다시 넣으면 낭독되지 않아 비운 뒤 다음 틱에 넣음
    if (invalidInputMessage) {
      setNotice('');
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = window.setTimeout(() => setNotice(invalidInputMessage), 0);
    }
  };

  // 닫으면서 입력칸으로 초점을 되돌릴 때 재열림 방지(초점이 안 돌아오는 경우를 위해 잠시 뒤 해제)
  const skipNextFocusOpen = () => {
    skipFocusOpenRef.current = true;
    window.clearTimeout(skipTimerRef.current);
    skipTimerRef.current = window.setTimeout(() => {
      skipFocusOpenRef.current = false;
    }, 300);
  };

  const selectDate = (date: Date) => {
    setDraft(null);
    setNotice('');
    onValueChange(date);
    skipNextFocusOpen();
    setOpen(false);
    inputRef.current?.focus();
  };

  // 달력을 닫고 Tab 순서상 입력칸 다음 칸으로 초점 이동(포털 달력과 포커스 가드를 건너뜀)
  const closeToNext = (event: KeyboardEvent<HTMLElement>) => {
    const input = inputRef.current;
    if (!input) return;
    const next = nextTabbableAfter(input, popupRef.current);
    commitDraft();
    next?.focus();
    if (next && document.activeElement === next) {
      event.preventDefault();
    } else if (popupRef.current?.contains(document.activeElement)) {
      // 다음 칸이 없거나 옮기지 못했으면 기본 Tab에 맡김. 달력 안이었으면 입력칸으로 돌아가며 다시 열리지 않게 함
      skipNextFocusOpen();
    }
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Tab은 달력을 닫고 다음 칸으로(달력에는 ↓로 들어감)
    if (event.key === 'Tab' && !event.shiftKey && open) {
      closeToNext(event);
      return;
    }
    // 입력 중이거나 달력이 열려 있을 때만 Enter로 확정(그 밖에는 form 제출을 막지 않음)
    if (event.key === 'Enter' && (draftRef.current !== null || open)) {
      event.preventDefault();
      commitDraft();
      setOpen(false);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusGridRef.current = true;
      if (open) {
        focusGridRef.current = false;
        popupRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]')?.focus();
      } else {
        setOpen(true);
      }
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, details) => {
        if (next) {
          setOpen(true);
          return;
        }
        // 입력칸 자체를 누른 것은 바깥 누름으로 보지 않음(커서 이동 중 닫히고 확정되지 않게)
        if (
          details.reason === 'outside-press' &&
          details.event.target instanceof Node &&
          anchorRef.current?.contains(details.event.target)
        ) {
          details.cancel();
          return;
        }
        if (details.reason === 'escape-key') {
          // Esc는 입력 취소: 입력 중인 글자를 버리고 이전 값 유지
          setDraft(null);
        } else {
          commitDraft();
        }
        // 초점이 달력 안에 있으면 Base UI가 입력칸으로 되돌림(finalFocus)
        if (popupRef.current?.contains(document.activeElement)) skipNextFocusOpen();
        setOpen(false);
      }}
    >
      {/* 바깥 상자를 label로 두어 여백·빈 곳을 눌러도 입력칸에 초점(이름은 입력칸의 aria-label이 정함) */}
      <label
        ref={anchorRef}
        {...keyboardFocusProps}
        data-open={open || undefined}
        className={cn(
          'bg-surface-primary border-border-secondary rounded-r5 px-padding-p8 flex h-11.75 w-full cursor-text items-center border',
          // 달력이 입력칸 폭으로 펼쳐져 잘리지 않게 최소 폭은 달력 폭(격자 322 + 좌우 padding-p8 16 = 354)
          'min-w-88.5',
          // 열린 동안(Figma Focused·Selected) 진한 테두리
          'data-open:border-border-strong',
          'data-focus-keyboard:outline-border-brand data-focus-keyboard:outline-2 data-focus-keyboard:outline-offset-2',
          disabled && 'cursor-not-allowed opacity-(--semantic-opacity-disabled)',
          className,
        )}
      >
        <input
          ref={inputRef}
          type="text"
          {...labelProps}
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? popupId : undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={draft ?? (value ? formatValue(value) : '')}
          onFocus={() => {
            if (skipFocusOpenRef.current) {
              skipFocusOpenRef.current = false;
              return;
            }
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setNotice('');
            setDraft(event.target.value);
            // Enter로 닫은 뒤 다시 입력하면 다시 열어 Esc 취소·달력 선택을 같게 함
            setOpen(true);
          }}
          onBlur={(event) => {
            // 달력으로 초점이 옮겨 가면 입력을 유지하고 닫지 않음
            if (pointerInPopupRef.current || popupRef.current?.contains(event.relatedTarget)) {
              return;
            }
            commitDraft();
            // Shift+Tab 등으로 다른 칸에 초점이 가면 달력도 닫음(포커스 가드로 가는 경우는 Tab 처리가 맡음)
            if (event.relatedTarget instanceof Element && !isFocusGuard(event.relatedTarget)) {
              setOpen(false);
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'typography-body-3-regular text-text-primary min-w-0 flex-1 truncate bg-transparent outline-none',
            // 선택 전 안내 글자(Figma Default)
            'placeholder:typography-body-3-semibold placeholder:text-text-quinary',
            'disabled:cursor-not-allowed',
          )}
        />
        {/* 직접 입력을 되돌린 이유 알림(항상 두고 글자만 바꿔 낭독되게) */}
        <span role="status" className="sr-only">
          {notice}
        </span>
      </label>
      <Popover.Portal>
        {/* 입력칸 아래 8px(Figma spacing-s4)에 입력칸 폭으로 펼침 */}
        <Popover.Positioner anchor={anchorRef} sideOffset={8} align="start" className="z-50">
          <Popover.Popup
            onPointerDown={() => {
              pointerInPopupRef.current = true;
            }}
            // 달력 안에서 Tab으로 끝을 지나면 닫고 다음 칸으로, Shift+Tab으로 처음을 지나면 입력칸으로
            onKeyDown={(event) => {
              if (event.key !== 'Tab' || !popupRef.current) return;
              const tabbables = popupTabbables(popupRef.current);
              if (!event.shiftKey && document.activeElement === tabbables.at(-1)) {
                closeToNext(event);
              } else if (event.shiftKey && document.activeElement === tabbables[0]) {
                event.preventDefault();
                inputRef.current?.focus();
              }
            }}
            onPointerUp={() => {
              pointerInPopupRef.current = false;
            }}
            ref={popupRef}
            id={popupId}
            aria-label={calendarLabel}
            // 열 때 초점은 입력칸에 그대로 두어 바로 입력할 수 있게 함. ↓ 키로 열었으면 날짜 격자로
            initialFocus={() => {
              if (!focusGridRef.current) return false;
              focusGridRef.current = false;
              return (
                popupRef.current?.querySelector<HTMLElement>('[role="grid"] [tabindex="0"]') ??
                false
              );
            }}
            // 닫는 순간 초점이 달력 안에 있을 때만 입력칸으로 되돌림(다른 칸을 눌러 닫혔으면 그 칸의 초점을 빼앗지 않음)
            finalFocus={() =>
              popupRef.current?.contains(document.activeElement) ? inputRef.current : false
            }
            className={cn(
              'rounded-r5 w-(--anchor-width) overflow-hidden outline-none',
              // 그림자는 토큰이 없어 Figma 값 그대로(토큰 추가 필요)
              'drop-shadow-[4px_4px_2px_rgba(0,0,0,0.1)]',
              // 펼침 모션은 Dropdown과 같은 값: 입력칸 쪽에서 살짝 커지며 열리고 줄며 닫힘, 동작 줄이기면 투명도만
              'origin-(--transform-origin) transition-[scale,opacity] duration-150 ease-out',
              'data-starting-style:scale-90 data-starting-style:opacity-0',
              'data-ending-style:pointer-events-none data-ending-style:scale-90 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-in',
              'motion-reduce:data-starting-style:scale-100 motion-reduce:data-ending-style:scale-100',
            )}
          >
            <Calendar
              selected={value}
              onSelectDate={selectDate}
              defaultMonth={value ?? undefined}
              minDate={minDate}
              maxDate={maxDate}
              isDateDisabled={isDateDisabled}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
