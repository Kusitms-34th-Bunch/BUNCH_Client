'use client';

import { useId, useRef, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import inputScale from '../../core/textField/inputScale.module.css';
import { EditingAnimation } from '../editingAnimation';
import { useTextareaAutoHeight } from '../labeledTextField/useTextareaAutoHeight.internal';
import { ProfileImage } from '../profileImage';

export type BundleCommentCardProps = Omit<
  ComponentProps<'textarea'>,
  'aria-label' | 'aria-describedby' | 'rows' | 'children' | 'className' | 'ref'
> & {
  /** 코멘트를 쓰는 멤버 이름 */
  userName: string;
  /** 내가 쓰는 코멘트면 이름 뒤에 "(나)"를 붙임 */
  currentUser?: boolean | undefined;
  /** "(나)"를 대신할 글자(i18n) */
  currentUserLabel?: string | undefined;
  /** 멤버 프로필 이미지 주소(없으면 배경색 원) */
  profileSrc?: string | undefined;
  /** 입력창의 접근성 이름(기본 "{이름} 코멘트", currentUser면 "{이름} (나) 코멘트") */
  label?: string | undefined;
  /** 있으면 카드 아래에 빨간 안내로 보이고 입력창을 잘못된 값(aria-invalid)으로 표시(Figma `State=Error`). 문구는 호출자가 결정 */
  error?: string | undefined;
  /** 다른 멤버가 쓰고 있는 코멘트(Figma `State=Editing`): 입력창 대신 점 3개 애니메이션 표시, 입력값은 호출자가 유지 */
  editing?: boolean | undefined;
  /** `editing` 동안 스크린 리더가 읽는 문구(예: "지예님이 작성 중"), 없으면 장식 처리 */
  editingLabel?: string | undefined;
  /** 카드 바깥 요소(카드와 오류 안내를 묶은 영역)에 적용할 클래스 */
  className?: string | undefined;
};

/**
 * 번들 코멘트 카드(Figma `BundleCommentCard`): 멤버 프로필·이름과 코멘트 입력창을 담은 흰 카드
 * Default·Focused(`focus-within`)·Filled(값)·Error(`error`)는 입력 상태에서, Editing은 `editing`으로 결정
 */
export function BundleCommentCard({
  userName,
  currentUser = false,
  currentUserLabel = '(나)',
  profileSrc,
  label,
  error,
  editing = false,
  editingLabel,
  className,
  id,
  value,
  placeholder = '코멘트를 남기면 번들을 발행할 수 있어요.',
  ...props
}: BundleCommentCardProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const ref = useRef<HTMLTextAreaElement>(null);

  useTextareaAutoHeight(ref, value, editing);

  return (
    <div className={cn('gap-s2 flex w-full flex-col', className)}>
      <div className="bg-surface-primary border-border-tertiary rounded-r5 px-padding-p7 py-s7 gap-s4 focus-within:border-primitive-gray-700 flex flex-col border forced-colors:focus-within:outline-2 forced-colors:focus-within:outline-offset-2">
        <div className="gap-s3 flex items-center">
          <ProfileImage src={profileSrc} className="border-border-tertiary size-6 border" />
          <div className="typography-body-1-medium text-text-primary gap-s1 flex items-center whitespace-nowrap">
            <span>{userName}</span>
            {currentUser && <span>{currentUserLabel}</span>}
          </div>
        </div>
        {editing && <EditingAnimation {...(editingLabel && { label: editingLabel })} />}
        {/* editing 중에도 입력창을 숨겨서 남겨 uncontrolled 값과 포커스 순서가 사라지지 않게 처리 */}
        <div className={cn(inputScale.textareaSlot, editing && 'hidden')}>
          <textarea
            ref={ref}
            id={inputId}
            rows={1}
            value={value}
            placeholder={placeholder}
            aria-label={label ?? `${userName}${currentUser ? ` ${currentUserLabel}` : ''} 코멘트`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="typography-body-2-regular text-text-secondary placeholder:text-text-quaternary py-padding-p1 block w-full resize-none overflow-hidden bg-transparent placeholder:font-(--semantic-font-weights-pretendard-1) placeholder:tracking-(--semantic-letter-spacing-1) focus:outline-none focus:placeholder:text-transparent"
            {...props}
          />
        </div>
      </div>
      {error ? (
        <p
          id={errorId}
          aria-hidden="true"
          className="typography-caption-1-medium text-system-fail-text flex h-5.5 items-center"
        >
          {error}
        </p>
      ) : null}
      {/* 오류 읽기는 오류가 생기기 전부터 있어야 하는 status 영역이 담당하고 보이는 문구는 중복 낭독 방지를 위해 숨김 */}
      <p role="status" className="sr-only">
        {error}
      </p>
    </div>
  );
}
