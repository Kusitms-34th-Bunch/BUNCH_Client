'use client';

import { useId, useRef, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import inputScale from '../../core/textField/inputScale.module.css';
import { FieldFooter } from './fieldFooter.internal';
import { useTextareaAutoHeight } from './useTextareaAutoHeight.internal';

export type LabeledTextAreaProps = Omit<
  ComponentProps<'textarea'>,
  'aria-label' | 'aria-describedby' | 'rows'
> & {
  /** 입력창 위에 보이는 라벨이자 입력창의 접근성 이름 */
  label: string;
  /** 있으면 입력창 아래에 빨간 안내로 보이고 입력창을 잘못된 값(aria-invalid)으로 표시. 문구는 호출자가 결정 */
  error?: string | undefined;
};

/**
 * 라벨·입력창·안내 줄을 세로로 쌓은 여러 줄 입력 필드
 * 한 줄로 시작해 내용이 길어지면 줄바꿈되며 높이 증가. 라벨·입력창 모양은 `LabeledTextField`와 통일
 */
export function LabeledTextArea({
  label,
  error,
  className,
  id,
  value,
  maxLength,
  placeholder,
  ...props
}: LabeledTextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const countId = `${inputId}-count`;
  const ref = useRef<HTMLTextAreaElement>(null);
  const showCount = maxLength !== undefined && typeof value === 'string';
  const describedBy = [error ? errorId : null, showCount ? countId : null]
    .filter(Boolean)
    .join(' ');

  useTextareaAutoHeight(ref, value);

  return (
    <div className={cn('gap-s3 flex w-full flex-col', className)}>
      <div className="gap-s2 flex flex-col">
        <label htmlFor={inputId} className="typography-body-3-semi-bold text-text-secondary">
          {label}
        </label>
        <div className="rounded-r5 border-border-secondary bg-surface-primary px-padding-p8 py-padding-p5 focus-within:border-primitive-gray-700 border forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-offset-2">
          <div className={inputScale.textareaSlot}>
            <textarea
              ref={ref}
              id={inputId}
              rows={1}
              value={value}
              maxLength={maxLength}
              placeholder={placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
              className="typography-body-3-regular text-text-primary placeholder:text-text-quaternary py-padding-p1 block w-full resize-none overflow-hidden bg-transparent placeholder:font-(--semantic-font-weights-pretendard-1) placeholder:tracking-(--semantic-letter-spacing-1) focus:outline-none focus:placeholder:text-transparent"
              {...props}
            />
          </div>
        </div>
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
