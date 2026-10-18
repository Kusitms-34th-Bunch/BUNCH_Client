'use client';

import { type ComponentProps, type ReactNode, useRef } from 'react';
import { LineCloseIcon } from '../../../icons';
import { cn } from '../../../utils';
import { fieldText } from './fieldText';

export type TextFieldProps = Omit<
  ComponentProps<'input'>,
  'type' | 'size' | 'ref' | 'aria-label'
> & {
  /** 입력창의 접근성 이름. placeholder는 label을 대체하지 못한다 */
  label: string;
  /** 오른쪽 동작 영역(예: `Button variant="brandSubtle" size="sm"`). 동작·접근성 이름은 호출자 소유 */
  action?: ReactNode;
  /** 지우기 버튼을 누를 때 호출한다. 값 비우기는 호출자가 한다. 값이 있는 controlled(value 지정)일 때만 버튼이 보이고, 누른 뒤 입력창으로 포커스가 돌아간다 */
  onClear?: () => void;
  /** 지우기 버튼의 접근성 이름 */
  clearLabel?: string;
};

export function TextField({
  label,
  action,
  onClear,
  clearLabel = '입력 지우기',
  className,
  disabled,
  value,
  placeholder = '글, 제목, 내용을 입력해주세요.',
  ...props
}: TextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const showClear =
    Boolean(onClear) && !disabled && !props.readOnly && value !== undefined && value !== '';

  const handleClear = () => {
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'gap-s2 rounded-r5 border-border-secondary bg-surface-primary pl-padding-p8 flex w-full items-center border',
        action ? 'py-padding-p3 pr-padding-p3' : 'py-padding-p5 pr-padding-p8',
        className,
      )}
    >
      <input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        className={cn(
          fieldText,
          // 포커스되면 안내 문구를 숨겨 캐럿만 보이게 한다(Figma Focused)
          'py-padding-p1 disabled:text-text-disabled focus:outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed',
        )}
        {...props}
        ref={inputRef}
        aria-label={label}
      />
      {showClear ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={handleClear}
          // Safari·터치에서 버튼을 누를 때 입력창 포커스가 빠지지 않도록 막는다
          onMouseDown={(event) => event.preventDefault()}
          className="-my-s4 -mr-s4 size-s16 text-icon-primary focus-visible:outline-border-brand inline-flex shrink-0 cursor-pointer items-center justify-center focus-visible:outline-2"
        >
          <span aria-hidden="true" className="bg-overlay-hover inline-flex size-4 rounded-full">
            <LineCloseIcon size="sm" />
          </span>
        </button>
      ) : null}
      {action}
    </div>
  );
}
