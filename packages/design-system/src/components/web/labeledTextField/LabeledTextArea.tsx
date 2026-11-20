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

// 사용자가 보는 글자(grapheme) 단위. 이모지·결합 문자도 1자
const graphemes = (text: string) =>
  Array.from(new Intl.Segmenter().segment(text), (part) => part.segment);

/**
 * 최대 글자 수를 넘으면 커서 앞(방금 넣은 글)만 줄인 값과 커서 자리. 커서 뒤의 원래 글은 지킴(브라우저 `maxLength`와 같음)
 * 넘지 않으면 null
 */
const capToLength = (value: string, caret: number, max: number) => {
  const head = graphemes(value.slice(0, caret));
  const tail = graphemes(value.slice(caret));
  if (head.length + tail.length <= max) return null;
  const kept = head.slice(0, Math.max(0, max - tail.length)).join('');
  return { value: kept + tail.slice(0, max).join(''), caret: kept.length };
};

/**
 * 라벨·입력창·안내 줄을 세로로 쌓은 여러 줄 입력 필드
 * 한 줄로 시작해 내용이 길어지면 줄바꿈되며 높이 증가. 라벨·입력창 모양은 `LabeledTextField`와 통일
 * `maxLength`는 보이는 글자 수로 세고 넘는 뒤쪽을 자름(브라우저 `maxLength`는 이모지를 2자 이상으로 셈)
 */
export function LabeledTextArea({
  label,
  error,
  className,
  id,
  value,
  maxLength,
  placeholder,
  onChange,
  onCompositionEnd,
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
        <label htmlFor={inputId} className="typography-body-3-semibold text-text-secondary">
          {label}
        </label>
        <div className="rounded-r5 border-border-secondary bg-surface-primary px-padding-p8 py-padding-p5 focus-within:border-primitive-gray-700 border forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-offset-2">
          <div className={inputScale.textareaSlot}>
            <textarea
              ref={ref}
              id={inputId}
              rows={1}
              value={value}
              placeholder={placeholder}
              onChange={(event) => {
                // 한글 조합 중에는 값을 바꾸면 조합이 끊길 수 있어 조합이 끝날 때 자름
                const input = event.target;
                const capped =
                  maxLength !== undefined && !(event.nativeEvent as InputEvent).isComposing
                    ? capToLength(input.value, input.selectionEnd, maxLength)
                    : null;
                if (capped) {
                  input.value = capped.value;
                  input.setSelectionRange(capped.caret, capped.caret);
                }
                onChange?.(event);
              }}
              onCompositionEnd={(event) => {
                onCompositionEnd?.(event);
                const input = event.currentTarget;
                const capped =
                  maxLength !== undefined
                    ? capToLength(input.value, input.selectionEnd, maxLength)
                    : null;
                if (!capped) return;
                // React가 값 변화를 알아채도록 기본 setter로 넣고 input 이벤트를 보내 onChange로 controlled 값에 반영
                Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
                  input,
                  capped.value,
                );
                input.setSelectionRange(capped.caret, capped.caret);
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
              className="typography-body-3-regular text-text-primary placeholder:text-text-quinary py-padding-p1 block w-full resize-none overflow-hidden bg-transparent placeholder:font-(--semantic-font-weights-pretendard-1) placeholder:tracking-(--semantic-letter-spacing-1) focus:outline-none focus:placeholder:text-transparent"
              {...props}
            />
          </div>
        </div>
      </div>
      <FieldFooter
        errorId={errorId}
        countId={countId}
        error={error}
        count={showCount ? { current: graphemes(value).length, max: maxLength } : undefined}
      />
    </div>
  );
}
