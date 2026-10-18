'use client';

import { useId } from 'react';
import { cn } from '../../../utils';
import { TextField, type TextFieldProps } from '../textField';
import { FieldFooter } from './fieldFooter.internal';

export type LabeledTextFieldProps = Omit<TextFieldProps, 'label' | 'aria-describedby'> & {
  /** 입력창 위에 보이는 라벨이자 입력창의 접근성 이름 */
  label: string;
  /** 있으면 입력창 아래에 빨간 안내로 보이고 입력창이 잘못된 값(aria-invalid)으로 표시된다. 문구는 호출자가 정한다 */
  error?: string | undefined;
};

/**
 * 라벨·입력창·안내 줄을 세로로 쌓은 입력 필드
 * `maxLength`와 문자열 `value`가 있으면 안내 줄 오른쪽에 글자 수(예: 5/12)를 보여 준다
 */
export function LabeledTextField({
  label,
  error,
  className,
  id,
  value,
  maxLength,
  ...props
}: LabeledTextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const countId = `${inputId}-count`;
  const showCount = maxLength !== undefined && typeof value === 'string';
  const describedBy = [error ? errorId : null, showCount ? countId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('gap-s3 flex w-full flex-col', className)}>
      <div className="gap-s2 flex flex-col">
        <label htmlFor={inputId} className="typography-body-2-meduim text-text-secondary">
          {label}
        </label>
        <TextField
          label={label}
          id={inputId}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...props}
        />
      </div>
      <FieldFooter
        errorId={errorId}
        countId={countId}
        error={error}
        count={showCount ? { current: value.length, max: maxLength } : undefined}
      />
    </div>
  );
}
