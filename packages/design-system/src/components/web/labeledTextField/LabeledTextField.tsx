'use client';

import { useId, useState } from 'react';
import { cn } from '../../../utils';
import { TextField, type TextFieldProps } from '../../core/textField';
import { Option, type OptionVariant } from '../option';

// 입력창은 자체 투명도, 제목·글자 수·오류 문구는 이 값 적용(각 한 번씩)
const DISABLED_OPACITY = 'opacity-(--semantic-opacity-disabled)';

export type LabeledTextFieldProps = Omit<
  TextFieldProps,
  'label' | 'action' | 'onClear' | 'clearLabel' | 'className'
> & {
  /** 입력창 위에 보이는 제목이자 입력창의 접근성 이름 */
  title: string;
  /** 제목 옆 필수·선택 표시 */
  option?: OptionVariant;
  /** 오류 문구. 있으면 입력창 아래 왼쪽에 빨간 글자로 표시하고 입력창에 `aria-invalid` 적용 */
  errorMessage?: string;
  /** 행 전체에 적용되는 class */
  className?: string;
};

/**
 * 제목 + 필수·선택 표시 + 입력창 + 글자 수/오류 문구(Figma `Labled_Text_Field`)
 * 입력창은 Figma 기본 변형의 core `TextField`(지우기·버튼 없음)이고, 나머지 props는 input에 전달
 * `maxLength`를 주면 오른쪽 아래에 "현재/최대" 글자 수를 표시하고 입력도 그 길이로 제한
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

  const [uncontrolledLength, setUncontrolledLength] = useState(String(defaultValue ?? '').length);
  const length = value === undefined ? uncontrolledLength : String(value).length;

  const hasCounter = maxLength !== undefined;
  // 호출자가 준 aria-describedby(예: 도움말)도 오류 문구·글자 수와 함께 유지
  const describedBy =
    [errorMessage ? errorId : null, hasCounter ? counterId : null, ariaDescribedBy]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('gap-s3 flex w-full flex-col items-end', className)}>
      <div className="gap-s2 flex w-full flex-col items-start">
        <label
          htmlFor={inputId}
          className={cn(
            'typography-body-2-meduim gap-s2 text-text-secondary flex items-center',
            disabled && DISABLED_OPACITY,
          )}
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
        />
      </div>
      {errorMessage || hasCounter ? (
        <div
          className={cn('gap-s3 flex w-full items-start justify-end', disabled && DISABLED_OPACITY)}
        >
          {errorMessage ? (
            <p
              id={errorId}
              role="alert"
              className="typography-caption-1-medium text-system-fail-text min-w-0 flex-1"
            >
              {errorMessage}
            </p>
          ) : null}
          {hasCounter ? (
            <span
              id={counterId}
              className="typography-body-3-regular text-text-tertiary shrink-0 whitespace-nowrap"
            >
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
