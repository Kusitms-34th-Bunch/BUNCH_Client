'use client';

import { type ComponentProps, type SubmitEvent, useRef } from 'react';
import { LineSearchIcon } from '../../../icons';
import { cn } from '../../../utils';
import { fieldText } from '../textField/fieldText';

export type SearchFieldProps = Omit<ComponentProps<'input'>, 'type' | 'ref'> & {
  /** Enter(키보드의 검색 키)를 누를 때 현재 입력값과 함께 호출 */
  // eslint-disable-next-line unused-imports/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  onSearch?: (query: string) => void;
  /** 입력창의 접근성 이름. placeholder로 label 대체 불가 */
  inputLabel?: string;
};

export function SearchField({
  onSearch,
  inputLabel = '검색어',
  disabled,
  className,
  placeholder = '글, 제목, 내용을 입력해주세요.',
  ...props
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch?.(inputRef.current?.value ?? '');
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        'gap-s2 bg-surface-secondary py-s4 pr-s4 pl-s6 flex w-full items-center rounded-full has-[input:disabled]:cursor-not-allowed',
        // 포커스 테두리 색·비활성 투명도는 TextField 기준 적용(Figma에 Focused·Disabled 시안 없음)
        'focus-within:outline-primitive-gray-700 focus-within:outline-1 forced-colors:focus-within:outline-2',
        'has-[input:disabled]:opacity-(--semantic-opacity-disabled)',
        className,
      )}
    >
      <LineSearchIcon size="sm" aria-hidden="true" className="text-icon-quaternary shrink-0" />
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label={inputLabel}
        disabled={disabled}
        className={cn(
          fieldText,
          'py-padding-p1 disabled:text-text-disabled focus:outline-none disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden',
        )}
        {...props}
      />
    </form>
  );
}
