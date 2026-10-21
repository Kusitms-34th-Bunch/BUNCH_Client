'use client';

import { useId, useLayoutEffect, useRef, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import inputScale from '../../core/textField/inputScale.module.css';
import { FieldFooter } from './fieldFooter.internal';

export type LabeledTextAreaProps = Omit<
  ComponentProps<'textarea'>,
  'aria-label' | 'aria-describedby' | 'rows'
> & {
  /** 입력창 위에 보이는 라벨이자 입력창의 접근성 이름 */
  label: string;
  /** 있으면 입력창 아래에 빨간 안내로 보이고 입력창이 잘못된 값(aria-invalid)으로 표시된다. 문구는 호출자가 정한다 */
  error?: string | undefined;
};

/**
 * 라벨·입력창·안내 줄을 세로로 쌓은 여러 줄 입력 필드
 * 한 줄로 시작해 내용이 길어지면 줄바꿈되며 높이가 늘어난다. 라벨·입력창 모양은 `LabeledTextField`와 맞춘 것이다
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

  // 값이 바뀔 때와 폭이 바뀔 때(회전·글자 크기 변경) 내용 높이에 맞춘다(auto로 줄였다가 scrollHeight로 늘림)
  // 그리기 전에 높이를 맞춰 줄바꿈 프레임에 잘려 보이지 않게 함
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      element.style.height = 'auto';
      const height = element.scrollHeight;
      element.style.height = `${height}px`;
      element.parentElement?.style.setProperty('--textarea-height', `${height}px`);
    };
    fit();
    if (typeof ResizeObserver === 'undefined' || !element.parentElement) return;
    let lastWidth = element.parentElement.clientWidth;
    const observer = new ResizeObserver(() => {
      const width = element.parentElement?.clientWidth ?? lastWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      fit();
    });
    observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className={cn('gap-s3 flex w-full flex-col', className)}>
      <div className="gap-s2 flex flex-col">
        <label htmlFor={inputId} className="typography-body-2-meduim text-text-secondary">
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
              className="typography-body-2-regular text-text-primary placeholder:text-text-quaternary py-padding-p1 block w-full resize-none overflow-hidden bg-transparent placeholder:font-(--semantic-font-weights-pretendard-1) placeholder:tracking-(--semantic-letter-spacing-1) focus:outline-none focus:placeholder:text-transparent"
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
