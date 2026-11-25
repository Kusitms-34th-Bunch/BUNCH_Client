'use client';

import { type ComponentProps, type KeyboardEvent, type ReactNode, useRef } from 'react';
import { LineCloseIcon } from '../../../icons';
import { cn } from '../../../utils';
import { fieldText } from './fieldText';
import inputScale from './inputScale.module.css';

export type TextFieldProps = Omit<
  ComponentProps<'input'>,
  'type' | 'size' | 'ref' | 'aria-label'
> & {
  /** 입력창의 접근성 이름. placeholder로 label 대체 불가 */
  label: string;
  /** 오른쪽 동작 영역(Figma Button 변형, 예: `Button variant="brandSubtle" size="sm"`). 동작·접근성 이름은 호출자 소유 */
  action?: ReactNode;
  /** 있으면 오른쪽에 지우기 버튼을 둔다(Figma Delete 변형). 누르면 호출하고 값 비우기는 호출자가 한다. 누른 뒤 입력창으로 포커스가 돌아간다. 값이 있을 때의 강한 테두리는 `value`를 주는 controlled 입력 기준 */
  onClear?: () => void;
  /** 지우기 버튼의 접근성 이름 */
  clearLabel?: string;
  /** Figma Editing 상태: 입력창 내용을 가리고 `editingContent`(편집 중 애니메이션)를 표시. 입력값은 유지 */
  editing?: boolean;
  /** `editing` 동안 입력창 자리에 보일 장식 내용(예: 앱이 만든 로티). 보조 기술에는 숨겨지며 없으면 내용만 가림 */
  editingContent?: ReactNode;
  /** `editing` 동안 스크린 리더가 읽는 문구(화면에는 안 보임). 없으면 음성 안내 생략 */
  editingLabel?: string;
  /**
   * 키보드 Enter(기본 완료 키 `done`, 터치 기기는 누른 뒤 키보드를 닫음). 한글 조합을 확정하는 Enter는 제외
   * 확인 버튼과 같은 동작이나 다음 칸 초점 이동(`next`)을 연결. 주면 form 자동 제출 대신 이 동작만
   */
  onEnterKey?: () => void;
};

// Safari는 조합을 끝내는 Enter 전에 compositionend를 보내 isComposing이 false라 keyCode 229도 확인
const isComposingEnter = (event: KeyboardEvent<HTMLInputElement>) =>
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- 조합 확정 Enter를 가릴 다른 값이 없음
  event.nativeEvent.isComposing || event.keyCode === 229;

// 화면 키보드가 뜨는 터치 기기
const hasTouchKeyboard = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

/**
 * 한 줄 입력창. Figma 변형 3종(기본·버튼·지우기)은 `action`·`onClear`로 고르고, 상태는 입력 상태에서 결정
 * Default·Focused(`focus-within`)·Filled(값)·Disabled(`disabled`, 전체 40% 투명)와 `editing` prop
 */
export function TextField({
  label,
  action,
  onClear,
  clearLabel = '입력 지우기',
  editing = false,
  editingContent,
  editingLabel,
  onEnterKey,
  enterKeyHint = 'done',
  onKeyDown,
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
            // 포커스 시 안내 문구를 숨겨 캐럿만 표시(Figma Focused)
            'py-padding-p1 disabled:text-text-disabled focus:outline-none focus:placeholder:text-transparent disabled:cursor-not-allowed',
            editing && 'opacity-0',
          )}
          {...props}
          enterKeyHint={enterKeyHint}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.key !== 'Enter' || isComposingEnter(event) || event.defaultPrevented) return;
            // 화면이 동작을 정했으면 form 자동 제출 대신 그 동작만, 없으면 브라우저 기본 동작 유지
            if (onEnterKey) {
              event.preventDefault();
              onEnterKey();
            }
            // 완료 키는 화면 키보드를 닫음(데스크톱은 초점 유지, form 기본 제출은 초점이 남아야 해 건드리지 않음)
            const leftToForm = !onEnterKey && event.currentTarget.form !== null;
            if (enterKeyHint === 'done' && hasTouchKeyboard() && !leftToForm) {
              event.currentTarget.blur();
            }
          }}
          ref={inputRef}
          aria-label={label}
          // `editing`이 아니어도 호출하는 쪽이 준 `aria-busy`(예: 값을 불러오는 중)는 그대로 둠
          aria-busy={editing ? true : props['aria-busy']}
        />
        {editing && editingContent ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center"
          >
            {editingContent}
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
          // Safari·터치에서 버튼을 누를 때 입력창 포커스 이탈 방지
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
