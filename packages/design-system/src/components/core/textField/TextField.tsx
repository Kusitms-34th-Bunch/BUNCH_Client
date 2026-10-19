'use client';

import { type ComponentProps, type ReactNode, useRef } from 'react';
import { LineCloseIcon } from '../../../icons';
import { cn } from '../../../utils';
import editingDots from './editingDots.module.css';
import { fieldText } from './fieldText';
import inputScale from './inputScale.module.css';

export type TextFieldProps = Omit<
  ComponentProps<'input'>,
  'type' | 'size' | 'ref' | 'aria-label'
> & {
  /** 입력창의 접근성 이름. placeholder는 label을 대체하지 못한다 */
  label: string;
  /** 오른쪽 동작 영역(Figma Button 변형, 예: `Button variant="brandSubtle" size="sm"`). 동작·접근성 이름은 호출자 소유 */
  action?: ReactNode;
  /** 있으면 오른쪽에 지우기 버튼을 둔다(Figma Delete 변형). 누르면 호출하고 값 비우기는 호출자가 한다. 누른 뒤 입력창으로 포커스가 돌아간다. 값이 있을 때의 강한 테두리는 `value`를 주는 controlled 입력 기준 */
  onClear?: () => void;
  /** 지우기 버튼의 접근성 이름 */
  clearLabel?: string;
  /** Figma Editing 상태: 입력창 내용을 가리고 점 3개 애니메이션을 보인다. 입력값은 유지된다 */
  editing?: boolean;
  /** `editing` 동안 스크린 리더가 읽는 문구(화면에는 안 보임). 없으면 말로 알리지 않는다 */
  editingLabel?: string;
};

/**
 * 한 줄 입력창. Figma 변형 3종(기본·버튼·지우기)은 `action`·`onClear`로 고르고, 상태는 입력 상태에서 정해진다
 * Default·Focused(`focus-within`)·Filled(값)·Disabled(`disabled`, 전체 40% 투명)와 `editing` prop
 */
export function TextField({
  label,
  action,
  onClear,
  clearLabel = '입력 지우기',
  editing = false,
  editingLabel,
  className,
  disabled,
  value,
  placeholder = '글, 제목, 내용을 입력해주세요.',
  ...props
}: TextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const showClear = Boolean(onClear) && !props.readOnly;
  const hasValue = value !== undefined && String(value) !== '';

  const handleClear = () => {
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'gap-s2 rounded-r5 border-border-secondary bg-surface-primary pl-padding-p8 focus-within:border-primitive-gray-700 flex w-full items-center border forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-offset-2',
        action ? 'py-padding-p3 pr-padding-p3' : 'py-padding-p5 pr-padding-p8',
        // 지우기 변형의 Filled·Editing은 포커스 없이도 강한 테두리(Figma Delete), Disabled는 제외
        onClear && !disabled && (hasValue || editing) && 'border-primitive-gray-700',
        'has-[input:disabled]:opacity-(--semantic-opacity-disabled)',
        className,
      )}
    >
      <div className={cn(inputScale.inputSlot, 'relative')}>
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          className={cn(
            fieldText,
            // 포커스되면 안내 문구를 숨겨 캐럿만 보이게 한다(Figma Focused)
            'py-padding-p1 disabled:text-text-disabled focus:outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed',
            editing && 'opacity-0',
          )}
          {...props}
          ref={inputRef}
          aria-label={label}
          aria-busy={editing || undefined}
        />
        {editing ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center"
          >
            {[0, 1, 2].map((dot) => (
              <span key={dot} className={editingDots.slot}>
                <span className={editingDots.dot} />
              </span>
            ))}
          </span>
        ) : null}
        {editingLabel !== undefined ? (
          <span role="status" className="sr-only">
            {editing ? editingLabel : ''}
          </span>
        ) : null}
      </div>
      {showClear ? (
        <button
          type="button"
          aria-label={clearLabel}
          disabled={disabled}
          onClick={handleClear}
          // Safari·터치에서 버튼을 누를 때 입력창 포커스가 빠지지 않도록 막는다
          onMouseDown={(event) => event.preventDefault()}
          className="-my-s4 -mr-s4 size-s16 text-icon-primary focus-visible:outline-border-brand inline-flex shrink-0 cursor-pointer items-center justify-center focus-visible:outline-2 disabled:cursor-not-allowed"
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
