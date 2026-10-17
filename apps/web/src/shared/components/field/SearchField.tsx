'use client';

import { LineSearchIcon, cn } from '@app/design-system';
import { type ComponentProps, type SubmitEvent, useRef } from 'react';
import { fieldText } from './fieldText';

export type SearchFieldProps = Omit<ComponentProps<'input'>, 'type' | 'ref'> & {
  /** Enter 또는 검색 버튼을 누를 때 현재 입력값과 함께 호출 */
  // eslint-disable-next-line unused-imports/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  onSearch?: (query: string) => void;
  /** 검색 버튼의 접근성 이름 */
  searchLabel?: string;
  /** 입력창의 접근성 이름. placeholder는 label을 대체하지 못한다 */
  inputLabel?: string;
};

export function SearchField({
  onSearch,
  searchLabel = '검색',
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
        'h-s15 gap-s2 rounded-r8 bg-surface-tertiary py-s3 pr-s4 pl-s6 flex w-full items-center has-[input:disabled]:cursor-not-allowed',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="search"
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label={inputLabel}
        disabled={disabled}
        className={cn(
          fieldText,
          'py-padding-p1 disabled:text-text-disabled h-full focus:outline-none disabled:cursor-not-allowed [&::-webkit-search-cancel-button]:hidden',
        )}
        {...props}
      />
      <button
        type="submit"
        aria-label={searchLabel}
        disabled={disabled}
        className="-my-s3 -mr-s4 size-s18 text-icon-primary focus-visible:outline-border-brand disabled:text-icon-disabled inline-flex shrink-0 cursor-pointer items-center justify-center focus-visible:outline-2 disabled:cursor-not-allowed"
      >
        <LineSearchIcon size="lg" aria-hidden="true" />
      </button>
    </form>
  );
}
