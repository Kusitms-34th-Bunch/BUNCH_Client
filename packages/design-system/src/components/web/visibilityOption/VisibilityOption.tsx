import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../../utils';

export type VisibilityOptionProps = Omit<
  ComponentProps<'input'>,
  'type' | 'children' | 'title' | 'disabled' | 'aria-labelledby' | 'aria-describedby'
> & {
  title: string;
  description: string;
  /** 왼쪽 원 안에 들어갈 그래픽 아이콘(34px). 장식이라 접근성에서 숨김 */
  icon: ReactNode;
};

/**
 * 공개 범위 선택 카드: 여러 카드 중 하나만 고르는 라디오
 * 같은 `name`을 주고 호출하는 쪽이 `fieldset`·`legend`로 묶어 질문 전달
 * `id`를 넘기면 제목·설명 요소 id(`<id>-title`, `<id>-description`)가 파생되니 문서 안에서 고유해야 함
 */
export const VisibilityOption = ({
  title,
  description,
  icon,
  className,
  id,
  ...props
}: VisibilityOptionProps) => {
  const generatedId = useId();
  const baseId = id ?? generatedId;

  return (
    <label
      className={cn(
        'gap-s7 px-s8 py-s7 rounded-r4 bg-surface-secondary group flex w-full cursor-pointer items-center',
        // 선택 표시는 배경 layer로 겹침(카드 위에 얹으면 아이콘까지 어두워짐)
        'has-checked:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
        'has-focus-visible:outline-border-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
        className,
      )}
    >
      <input
        type="radio"
        id={baseId}
        aria-labelledby={`${baseId}-title`}
        aria-describedby={`${baseId}-description`}
        className="sr-only"
        {...props}
      />
      <span
        aria-hidden="true"
        className="size-s21 bg-surface-primary flex shrink-0 items-center justify-center rounded-full group-has-checked:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]"
      >
        {icon}
      </span>
      <span className="gap-s2 flex min-w-0 flex-1 flex-col">
        <span id={`${baseId}-title`} className="typography-body-1-medium text-text-secondary">
          {title}
        </span>
        <span id={`${baseId}-description`} className="typography-body-4-regular text-text-primary">
          {description}
        </span>
      </span>
    </label>
  );
};
