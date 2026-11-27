'use client';

import { type ComponentProps, type ReactNode, useId } from 'react';
import { LineChevronRightSmallIcon, LineCloseSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { IconButton } from '../../core/iconButton';
import { BundleTitle, type BundleTitleMember } from '../bundleTitle';
import { ChipButton } from '../chipButton';

export type SelectionFieldProps = Omit<ComponentProps<'div'>, 'children' | 'title' | 'onSelect'> & {
  /** 제목 글자: 선택 전에는 안내 문구(예: "위치 추가"), 선택 뒤에는 선택한 값(예: "서울특별시 여의도동") */
  label: string;
  /** 값이 선택된 상태(Figma `State=Selected`): 오른쪽이 화살표에서 지우기 버튼으로 바뀜 */
  selected?: boolean | undefined;
  /** 어떤 필드인지 알려 주는 이름(예: "위치"), 화면에는 안 보이고 필드 버튼의 접근성 이름 앞에 붙음 */
  fieldLabel?: string | undefined;
  /** 제목 앞 아이콘(기본 위치 핀, 날짜 필드는 `'calendar'`) */
  icon?: 'map-pin' | 'calendar' | undefined;
  /** 제목 앞 아이콘 자리에 대신 놓을 요소(예: 순서를 바꾸는 햄버거 핸들). 주면 `icon`은 그리지 않고, 카드 전체 버튼 위에서 따로 눌림 */
  handle?: ReactNode;
  /** 제목 오른쪽에 보일 멤버 프로필(다른 멤버가 이 필드를 편집 중일 때 등, 앞에서부터 최대 8명) */
  members?: readonly BundleTitleMember[] | undefined;
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
  /** true면 추천 칩은 눌림 효과·포커스가 없고 눌러도 값을 고르지 않으며 누른 자리는 필드 버튼(`onFieldClick`)이 받음(고를 수 없는 사람에게 보이는 읽기 전용 칩, 기본 false) */
  suggestionsDisabled?: boolean | undefined;
  /** 선택된 값을 지울 때(지우기 버튼은 `selected`일 때만 나타남) */
  onClear?: (() => void) | undefined;
  /** 지우기 버튼의 접근성 이름(기본 "{label} 지우기") */
  clearLabel?: string | undefined;
  /** false면 선택된 값에도 지우기 버튼을 보이지 않음(고칠 수 없는 사람에게 보이는 읽기 전용 줄, 기본 true) */
  clearable?: boolean | undefined;
};

/**
 * 선택 필드(Figma `Selection Field`): 회색 카드에 `BundleTitle`(위치 핀·제목·필수 표시, Weak)과 오른쪽 아이콘
 * 선택 전에는 화살표와 추천 값(`ChipButton`, 선택), 선택 뒤에는 지우기 버튼이며 `className`은 카드에 적용
 * 필드 버튼은 카드 전체를 덮는 빈 버튼이고 `BundleTitle`(div)이 그 이름(`aria-labelledby`), 제목은 이름으로만 읽히도록 `aria-hidden`
 */
export const SelectionField = ({
  label,
  fieldLabel,
  selected = false,
  icon = 'map-pin',
  handle,
  members,
  required = false,
  requiredLabel = '필수',
  suggestions,
  suggestionsLabel = '추천',
  onFieldClick,
  onSuggestionClick,
  suggestionsDisabled = false,
  onClear,
  clearLabel,
  clearable = true,
  className,
  ...props
}: SelectionFieldProps) => {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const fieldLabelId = `${generatedId}-field`;
  const showSuggestions = !selected && suggestions !== undefined && suggestions.length > 0;

  return (
    <div
      className={cn(
        'bg-surface-secondary rounded-r5 px-s7 relative flex w-full',
        showSuggestions ? 'py-s8 gap-s5 flex-col' : 'py-s5 items-center',
        className,
      )}
      {...props}
    >
      {/* 카드 전체를 덮는 빈 버튼, 지우기 버튼·추천 칩은 그 위(z-10)에서 따로 눌림 */}
      <button
        type="button"
        aria-labelledby={fieldLabel ? `${fieldLabelId} ${titleId}` : titleId}
        onClick={onFieldClick}
        className="rounded-r5 focus-visible:outline-border-brand absolute inset-0 cursor-pointer touch-manipulation outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      {fieldLabel && (
        <span id={fieldLabelId} aria-hidden="true" className="sr-only">
          {fieldLabel}:
        </span>
      )}
      <div className="gap-s4 flex h-6 min-w-0 flex-1 items-center">
        {handle ? (
          // 핸들과 제목 사이는 아이콘 자리와 같은 6px(행 간격 8px에서 뺌)
          <span className="-mr-s1 relative z-10 flex shrink-0 items-center">{handle}</span>
        ) : null}
        <BundleTitle
          id={titleId}
          aria-hidden="true"
          title={label}
          variant="weak"
          icon={handle ? false : icon}
          members={members}
          required={required}
          requiredLabel={requiredLabel}
          // BundleTitle 기본 높이 25px을 Figma 필드 줄 높이 24px에 맞춤
          className="h-6 min-w-0 flex-1"
        />
        {selected ? (
          clearable && (
            <IconButton
              variant="plain"
              aria-label={clearLabel ?? `${label} 지우기`}
              onClick={onClear}
              // 보이는 16px보다 넓은 32px 누르는 범위(design-system-icons.md의 Small 기준)
              className="text-icon-primary z-10 size-4 before:-inset-2 focus-visible:outline-offset-2"
            >
              <LineCloseSmallIcon aria-hidden="true" />
            </IconButton>
          )
        ) : (
          <LineChevronRightSmallIcon aria-hidden="true" className="text-icon-primary shrink-0" />
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
              <ChipButton
                size="M"
                // 비활성일 때 보조 기기로 누르면(포인터는 필드 버튼이 받음) 필드를 누른 것과 같게 처리해 안내가 나가게 함
                onClick={() =>
                  suggestionsDisabled ? onFieldClick?.() : onSuggestionClick?.(suggestion)
                }
                // 눌 수 없을 때는 칩이 클릭을 받지 않아 카드 전체를 덮는 필드 버튼이 받음(눌림 효과 없음)
                {...(suggestionsDisabled && { tabIndex: -1, 'aria-disabled': true })}
                // 회색 카드 위에서 보이도록 칩은 흰 배경(Figma `surface-primary`)
                className={cn(
                  'bg-surface-primary',
                  suggestionsDisabled ? 'pointer-events-none' : 'pointer-events-auto',
                )}
              >
                {suggestion}
              </ChipButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
