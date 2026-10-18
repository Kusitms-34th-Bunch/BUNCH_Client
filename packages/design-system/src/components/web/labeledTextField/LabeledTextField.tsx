'use client';

import { type FocusEvent, useId, useState } from 'react';
import { cn } from '../../../utils';
import { TextField, type TextFieldProps } from '../../core/textField';
import { Option, type OptionVariant } from '../option';

export type LabeledTextFieldProps = Omit<TextFieldProps, 'label' | 'action' | 'className'> & {
  /** 입력창 위에 보이는 제목이자 입력창의 접근성 이름 */
  title: string;
  /** 제목 옆 필수·선택 표시 */
  option?: OptionVariant;
  /** 오류 문구. 있으면 입력창 아래 왼쪽에 빨간 글자로 보이고 입력창은 `aria-invalid`가 된다 */
  errorMessage?: string;
  /** 행 전체에 적용되는 class */
  className?: string;
};

/**
 * 제목 + 필수·선택 표시 + 입력창 + 글자 수/오류 문구(Figma `Labled_Text_Field`)
 * 입력창은 core `TextField`이며, 나머지 props는 input에 전달된다
 * `maxLength`를 주면 오른쪽 아래에 "현재/최대" 글자 수를 보이고 입력도 그 길이로 제한된다
 * 지우기 버튼은 포커스가 있고 값이 있을 때만 보인다(Figma의 Editing). 값은 `value`·`onClear`로 호출하는 쪽이 비운다
 */
export const LabeledTextField = ({
  title,
  option,
  errorMessage,
  className,
  id,
  value,
  defaultValue,
  maxLength,
  onChange,
  onClear,
  disabled,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}: LabeledTextFieldProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const counterId = `${inputId}-counter`;

  const [focused, setFocused] = useState(false);
  const [uncontrolledLength, setUncontrolledLength] = useState(String(defaultValue ?? '').length);
  const length = value === undefined ? uncontrolledLength : String(value).length;

  const hasCounter = maxLength !== undefined;
  // 호출자가 준 aria-describedby(예: 도움말)도 오류 문구·글자 수와 함께 유지한다
  const describedBy =
    [errorMessage ? errorId : null, hasCounter ? counterId : null, ariaDescribedBy]
      .filter(Boolean)
      .join(' ') || undefined;

  // 포커스가 이 영역 안(입력창·지우기 버튼) 사이를 옮겨 갈 때는 포커스가 유지된 것으로 본다
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    <div
      className={cn(
        'gap-s3 flex w-full flex-col items-end',
        disabled && 'opacity-(--semantic-opacity-disabled)',
        className,
      )}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <div className="gap-s2 flex w-full flex-col items-start">
        <label
          htmlFor={inputId}
          className="typography-body-2-meduim gap-s2 text-text-secondary flex items-center"
        >
          {title}
          {option ? <Option variant={option} /> : null}
        </label>
        <TextField
          {...props}
          label={title}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={errorMessage ? true : ariaInvalid}
          aria-required={option === 'required' ? true : ariaRequired}
          aria-describedby={describedBy}
          onChange={(event) => {
            setUncontrolledLength(event.target.value.length);
            onChange?.(event);
          }}
          {...(focused && onClear ? { onClear } : {})}
        />
      </div>
      {errorMessage || hasCounter ? (
        <div
          className={cn(
            'flex w-full items-start',
            errorMessage ? 'justify-between' : 'justify-end',
          )}
        >
          {errorMessage ? (
            <p
              id={errorId}
              role="alert"
              className="typography-caption-1-medium text-system-fail-text"
            >
              {errorMessage}
            </p>
          ) : null}
          {hasCounter ? (
            <span id={counterId} className="typography-body-3-regular text-text-tertiary">
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
