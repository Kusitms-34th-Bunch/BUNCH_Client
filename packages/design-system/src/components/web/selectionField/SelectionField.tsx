import type { ComponentProps } from 'react';
import {
  LineChevronRightMediumIcon,
  LineCloseMediumIcon,
  LineMapPinSmallIcon,
} from '../../../icons';
import { cn } from '../../../utils';

export type SelectionFieldProps = Omit<ComponentProps<'div'>, 'children' | 'title' | 'onSelect'> & {
  /** 제목 글자: 선택 전에는 안내 문구(예: "위치 추가"), 선택 뒤에는 선택한 값(예: "서울특별시 여의도동") */
  label: string;
  /** 값이 선택된 상태(Figma `State=Selected`): 오른쪽이 화살표에서 지우기 버튼으로 바뀜 */
  selected?: boolean | undefined;
  /** 어떤 필드인지 알려 주는 이름(예: "위치"), 화면에는 안 보이고 필드 버튼의 접근성 이름 앞에 붙음 */
  fieldLabel?: string | undefined;
  /** 필수 입력 표시(제목 뒤 별표) */
  required?: boolean | undefined;
  /** 필수 표시를 읽어 주는 글자(기본 "필수") */
  requiredLabel?: string | undefined;
  /** 선택 전에 아래에 보여 줄 추천 값(Figma `Suggestion=True`), 선택된 상태에서는 보이지 않음 */
  suggestions?: readonly string[] | undefined;
  /** 추천 목록의 접근성 이름(기본 "추천") */
  suggestionsLabel?: string | undefined;
  /** 필드를 눌러 값을 고르러 갈 때 */
  onFieldClick?: (() => void) | undefined;
  /** 추천 값을 눌렀을 때 */
  onSuggestionClick?: ((_suggestion: string) => void) | undefined;
  /** 선택된 값을 지울 때(지우기 버튼은 `selected`일 때만 나타남) */
  onClear?: (() => void) | undefined;
  /** 지우기 버튼의 접근성 이름(기본 "{label} 지우기") */
  clearLabel?: string | undefined;
};

/**
 * 선택 필드(Figma `Selection Field`): 흰 카드에 위치 핀·제목·필수 표시와 오른쪽 아이콘
 * 선택 전에는 화살표와 추천 값(선택), 선택 뒤에는 지우기 버튼이며 `className`은 카드에 적용
 */
export const SelectionField = ({
  label,
  fieldLabel,
  selected = false,
  required = false,
  requiredLabel = '필수',
  suggestions,
  suggestionsLabel = '추천',
  onFieldClick,
  onSuggestionClick,
  onClear,
  clearLabel,
  className,
  ...props
}: SelectionFieldProps) => {
  const showSuggestions = !selected && suggestions !== undefined && suggestions.length > 0;

  return (
    <div
      className={cn(
        'bg-surface-primary border-border-tertiary rounded-r5 px-s7 relative flex w-full border',
        showSuggestions ? 'py-s8 gap-s5 flex-col' : 'py-s5 items-center',
        className,
      )}
      {...props}
    >
      <div className="flex h-6 min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={onFieldClick}
          className={cn(
            'gap-s4 flex h-6 min-w-0 flex-1 cursor-pointer touch-manipulation items-center text-left',
            // 버튼을 카드 전체로 넓혀 여백을 눌러도 필드가 눌리게 처리(추천 값·지우기 버튼은 그 위)
            "after:rounded-r5 after:absolute after:inset-0 after:content-['']",
            'focus-visible:after:outline-border-brand outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2',
          )}
        >
          <span className="gap-s2 text-icon-primary flex min-w-0 items-center">
            <LineMapPinSmallIcon aria-hidden="true" className="shrink-0" />
            <span className="gap-s1 flex min-w-0 items-center">
              {fieldLabel && <span className="sr-only">{fieldLabel}: </span>}
              <span className="typography-body-2-meduim text-text-secondary truncate">{label}</span>
              {required && (
                <>
                  <span
                    aria-hidden="true"
                    className="typography-body-1-semi-bold text-icon-brand shrink-0"
                  >
                    *
                  </span>
                  <span className="sr-only">{requiredLabel}</span>
                </>
              )}
            </span>
          </span>
          {!selected && (
            <LineChevronRightMediumIcon
              aria-hidden="true"
              className="text-icon-primary ml-auto shrink-0"
            />
          )}
        </button>
        {selected && (
          <button
            type="button"
            aria-label={clearLabel ?? `${label} 지우기`}
            onClick={onClear}
            className={cn(
              'text-icon-primary relative z-10 flex size-5 shrink-0 cursor-pointer touch-manipulation items-center justify-center',
              // 보이는 20px보다 넓은 40px 터치 영역(design-system-icons.md의 Medium 기준)
              "before:absolute before:-inset-2.5 before:content-['']",
              'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
            )}
          >
            <LineCloseMediumIcon aria-hidden="true" />
          </button>
        )}
      </div>
      {showSuggestions && (
        // 목록의 빈 영역은 클릭을 필드 버튼으로 흘려보내고 칩만 눌리게 처리
        <ul
          aria-label={suggestionsLabel}
          className="gap-s3 pointer-events-none relative z-10 flex w-full flex-wrap"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion}-${index}`}>
              <button
                type="button"
                onClick={() => onSuggestionClick?.(suggestion)}
                className={cn(
                  'bg-surface-secondary typography-body-2-regular text-text-tertiary px-s5 pointer-events-auto inline-flex h-9 cursor-pointer touch-manipulation items-center justify-center rounded-full whitespace-nowrap',
                  'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
                )}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
