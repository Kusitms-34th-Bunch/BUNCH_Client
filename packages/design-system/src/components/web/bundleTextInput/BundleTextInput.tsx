'use client';

import { useId } from 'react';
import { cn } from '../../../utils';
import { TextField, type TextFieldProps } from '../../core/textField';
import { BundleTitle, type BundleTitleProps } from '../bundleTitle';

export type BundleTextInputProps = Omit<
  TextFieldProps,
  | 'label'
  | 'action'
  | 'onClear'
  | 'clearLabel'
  | 'editing'
  | 'editingLabel'
  | 'className'
  | 'aria-labelledby'
  | 'disabled'
> &
  Pick<
    BundleTitleProps,
    'title' | 'icon' | 'required' | 'requiredLabel' | 'members' | 'membersLabel'
  > & {
    /** 오류 문구. 있으면 입력창 아래에 빨간 글자로 보이고 입력창에 `aria-invalid` 적용. 문구는 호출자가 결정 */
    errorMessage?: string | undefined;
    /** 전체(제목+입력창+오류 문구)에 적용되는 class */
    className?: string | undefined;
  };

/**
 * 번들 텍스트 입력(Figma `BundleTextInput`): `BundleTitle` 제목 줄 + 한 줄 입력창 + 오류 문구
 * 제목(위치 핀·제목·멤버 아바타)이 입력창의 접근성 이름이고, 나머지 props는 core `TextField`(기본 변형)의 input에 전달
 * 폭은 부모 폭에 맞춤(Figma 344px)
 */
export const BundleTextInput = ({
  title,
  icon,
  required,
  requiredLabel,
  members,
  membersLabel,
  errorMessage,
  className,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}: BundleTextInputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const titleId = `${inputId}-title`;
  const errorId = `${inputId}-error`;
  // 호출자가 준 aria-describedby(예: 도움말)도 오류 문구와 함께 유지
  const describedBy = [errorMessage ? errorId : null, ariaDescribedBy].filter(Boolean).join(' ');

  return (
    <div className={cn('gap-s2 flex w-full flex-col items-start', className)}>
      <div className="gap-s3 flex w-full flex-col items-start">
        <BundleTitle
          title={title}
          titleId={titleId}
          icon={icon}
          required={required}
          requiredLabel={requiredLabel}
          members={members}
          membersLabel={membersLabel}
        />
        <TextField
          {...props}
          label={title}
          id={inputId}
          aria-labelledby={titleId}
          aria-invalid={errorMessage ? true : ariaInvalid}
          aria-required={required ? true : ariaRequired}
          aria-describedby={describedBy || undefined}
        />
      </div>
      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="typography-caption-1-medium text-system-fail-text flex min-h-5.5 w-full items-center"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};
