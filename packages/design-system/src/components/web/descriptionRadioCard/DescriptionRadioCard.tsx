import { useId, type ComponentProps } from 'react';
import { cn } from '../../../utils';
import { Radio } from '../../core/radio';

export type DescriptionRadioCardProps = Omit<
  ComponentProps<'input'>,
  'type' | 'children' | 'title' | 'aria-labelledby' | 'aria-describedby'
> & {
  /** 제목(라디오 접근성 이름) */
  title: string;
  /** 설명(접근성 설명, 길면 줄바꿈). 없으면 제목만 */
  description?: string | undefined;
};

/**
 * 제목·설명이 있는 선택 카드(Figma `Radio Card - Description`): 왼쪽 라디오
 * 그룹(`name`·`fieldset`)과 선택 값은 호출자 담당. `id`를 넘기면 제목·설명 id가 파생되므로 문서 안에서 고유해야 함
 */
export const DescriptionRadioCard = ({
  title,
  description,
  className,
  id,
  ...props
}: DescriptionRadioCardProps) => {
  const generatedId = useId();
  const baseId = id ?? generatedId;

  return (
    <label
      className={cn(
        'bg-surface-secondary rounded-r5 p-padding-p6 gap-s5 group flex w-full cursor-pointer touch-manipulation items-center',
        // 눌림은 바탕 layer로 겹쳐 글자는 그대로 유지
        'not-has-disabled:active:bg-[linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
        'has-checked:bg-surface-brand-subtle-1 has-checked:ring-border-brand-subtle has-checked:ring-1 has-checked:ring-inset',
        'has-disabled:cursor-not-allowed has-disabled:opacity-(--semantic-opacity-disabled)',
        className,
      )}
    >
      <Radio
        id={baseId}
        aria-labelledby={`${baseId}-title`}
        aria-describedby={description ? `${baseId}-description` : undefined}
        {...props}
      />
      <span className="gap-s1 flex min-w-0 flex-1 flex-col wrap-break-word break-keep">
        <span
          id={`${baseId}-title`}
          className="typography-body-3-semi-bold text-text-primary group-has-disabled:text-text-disabled"
        >
          {title}
        </span>
        {description ? (
          <span
            id={`${baseId}-description`}
            className="typography-caption-1-regular text-text-tertiary group-has-disabled:text-text-disabled"
          >
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
};
