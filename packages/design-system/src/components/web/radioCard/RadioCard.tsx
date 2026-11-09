import { useId, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import { Radio } from '../../core/radio';

export type RadioCardProps = Omit<
  ComponentProps<'input'>,
  'type' | 'children' | 'title' | 'disabled' | 'aria-labelledby' | 'aria-describedby'
> & {
  /** 제목(라디오 접근성 이름) */
  title: string;
  /** 설명(접근성 설명, 길면 줄바꿈) */
  description: string;
};

/**
 * 제목·설명의 선택 카드(Figma `Radio Card`): 같은 `name`의 카드 중 하나를 고르는 라디오
 * 그룹 묶음(`fieldset`·`legend`)과 선택 값은 호출하는 쪽 담당, `className`은 카드에 적용
 */
export const RadioCard = ({ className, title, description, ...props }: RadioCardProps) => {
  const id = useId();

  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control -- 글자가 탐색 깊이(2)보다 아래라 생기는 오탐, Radio와 글자 모두 label 안
    <label
      className={cn(
        'bg-surface-secondary px-padding-p8 py-s9 gap-s7 rounded-r4 relative isolate flex w-full cursor-pointer touch-manipulation items-center',
        // hover는 카드 위에 겹쳐 라디오 원까지 함께 어두워지게 처리
        'before:rounded-r4 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:z-10 before:opacity-0',
        'hover:not-has-checked:before:opacity-100',
        'has-checked:bg-surface-brand-subtle-1 has-checked:ring-border-brand-subtle has-checked:ring-1 has-checked:ring-inset',
        'has-focus-visible:outline-border-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
        className,
      )}
    >
      <Radio
        className="has-focus-visible:outline-0"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        {...props}
      />
      <span className="gap-s2 flex min-w-0 flex-1 flex-col wrap-break-word break-keep">
        <span id={`${id}-title`} className="typography-body-2-medium text-text-tertiary">
          {title}
        </span>
        <span
          id={`${id}-description`}
          className="typography-caption-1-regular text-text-quaternary"
        >
          {description}
        </span>
      </span>
    </label>
  );
};
