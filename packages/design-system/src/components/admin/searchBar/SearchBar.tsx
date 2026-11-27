import type { ComponentProps } from 'react';
import { LineSearchMediumIcon } from '../../../icons';
import { cn } from '../../../utils';
import { useKeyboardFocusWithin } from '../keyboardFocus.internal';

export type SearchBarProps = Omit<ComponentProps<'input'>, 'type' | 'aria-label'> & {
  /** 보이는 라벨이 없어 접근성 이름 필수(예: "장소명 검색") */
  'aria-label': string;
  /** 바깥 상자에 적용 */
  className?: string | undefined;
};

/**
 * 어드민 검색 입력창(Figma `어드민 컴포넌트` > `SearchBar`): 검색 아이콘 + 한 줄 입력, Default·Focused·Filled·Disabled
 * 제출(검색 버튼·Enter)은 호출자가 감싸는 form 담당. core `SearchField`(모바일 form 검색창)와 규격이 다른 별도 컴포넌트
 */
export const SearchBar = ({ className, disabled, ...props }: SearchBarProps) => {
  const keyboardFocusProps = useKeyboardFocusWithin();
  return (
    <div
      {...keyboardFocusProps}
      className={cn(
        'bg-surface-primary border-border-tertiary rounded-r3 px-padding-p8 py-padding-p5 gap-s5 flex h-12 w-full items-center border',
        // 포커스는 Figma에 모양이 없어 키보드로 들어왔을 때만 윤곽으로 알림(마우스로 누르면 커서만)
        'data-focus-keyboard:outline-border-brand data-focus-keyboard:outline-2 data-focus-keyboard:outline-offset-2',
        disabled && 'opacity-(--semantic-opacity-disabled)',
        className,
      )}
    >
      <LineSearchMediumIcon className="text-icon-quaternary shrink-0" />
      <input
        type="search"
        disabled={disabled}
        className={cn(
          'typography-body-3-semibold text-text-tertiary placeholder:text-text-disabled min-w-0 flex-1 bg-transparent outline-none',
          // 브라우저 기본 지우기 버튼 숨김(Figma에 없음)
          '[&::-webkit-search-cancel-button]:appearance-none',
          'disabled:cursor-not-allowed',
        )}
        {...props}
      />
    </div>
  );
};
