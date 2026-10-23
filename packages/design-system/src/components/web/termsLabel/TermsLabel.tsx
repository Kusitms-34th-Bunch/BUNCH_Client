import type { ComponentProps, ReactNode } from 'react';
import { FillCircleCheckMediumIcon, LineChevronRightMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type TermsLabelProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  /** 약관 이름(예: "서비스 이용 약관"). 접근성 이름에 `tag`와 함께 포함 */
  children: ReactNode;
  /** 이름 앞 구분 글자(예: "[필수]") */
  tag?: ReactNode;
  /** 있으면 오른쪽에 약관 내용 보기 버튼(chevron)을 그리고 누를 때 호출한다. 약관 페이지 이동은 호출하는 쪽이 처리 */
  onViewTerms?: (() => void) | undefined;
  /** 약관 내용 보기 버튼의 접근성 이름 */
  viewLabel?: string | undefined;
};

/**
 * 약관 동의 행: 체크박스 하나와 선택적인 약관 보기 버튼(Figma `Terms Label`)
 * `className`은 행 전체에, 나머지 props는 native checkbox에 전달
 * 선택 전은 아이콘 40%·글자 흐림, 선택되면 아이콘 80%·글자 진함(Figma의 Disabled → Default)
 */
export const TermsLabel = ({
  tag,
  onViewTerms,
  viewLabel = '약관 내용 보기',
  className,
  children,
  ...props
}: TermsLabelProps) => (
  <div
    className={cn(
      // 눌림은 체크 영역(label)을 누를 때만 표시(chevron 버튼과 비활성은 제외)
      // 눌림: 선택된 모양(아이콘 80%·진한 글자)에 overlay-dim-subtle(10%)를 아이콘·글자 위까지 덮는다. Figma 실측: 아이콘 #a2a4a7→#919395
      'pr-padding-p4 relative isolate flex w-full items-center justify-between',
      'before:bg-overlay-dim-subtle before:pointer-events-none before:absolute before:inset-0 before:z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
      'has-[label:active]:not-has-[input:disabled]:before:opacity-100',
      className,
    )}
  >
    <label className="group/check gap-s3 pl-padding-p4 py-padding-p2 has-[input:focus-visible]:outline-border-brand flex min-w-0 flex-1 cursor-pointer touch-manipulation items-center has-[input:disabled]:cursor-not-allowed has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2">
      <input type="checkbox" className="peer sr-only" {...props} />
      <FillCircleCheckMediumIcon
        aria-hidden="true"
        className="text-icon-quaternary shrink-0 opacity-(--semantic-opacity-disabled) group-[:active:not(:has(input:disabled))]/check:opacity-(--semantic-opacity-semi-opaque) peer-checked:opacity-(--semantic-opacity-semi-opaque)"
      />
      <span className="typography-body-2-regular gap-s2 text-text-disabled peer-checked:text-text-secondary group-[:active:not(:has(input:disabled))]/check:text-text-secondary flex min-w-0 items-center">
        {tag ? <span className="shrink-0">{tag}</span> : null}
        <span className="min-w-0">{children}</span>
      </span>
    </label>
    {onViewTerms ? (
      <button
        type="button"
        aria-label={viewLabel}
        onClick={onViewTerms}
        // after: 보이는 20px보다 넓은 터치 영역(가로 44px)
        className="text-icon-quaternary focus-visible:outline-border-brand ml-s6 relative inline-flex shrink-0 cursor-pointer items-center justify-center after:absolute after:-inset-x-3 after:-inset-y-1.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <LineChevronRightMediumIcon aria-hidden="true" />
      </button>
    ) : null}
  </div>
);
