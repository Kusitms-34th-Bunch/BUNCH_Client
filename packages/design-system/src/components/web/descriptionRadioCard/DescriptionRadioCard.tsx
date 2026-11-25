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
        'press-scale-large bg-surface-secondary rounded-r5 p-padding-p6 gap-s5 group relative isolate flex w-full cursor-pointer touch-manipulation items-center',
        // 눌림은 글자 뒤 layer로 overlay-hover(10%)를 겹쳐 글자는 그대로 유지. While Pressing / Dissolve / Ease out / 75ms(화면설계서 2145:39607, 색은 2026-11-24 「색상 수정된 컴포넌트」)
        'before:rounded-r5 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out not-has-disabled:active:before:opacity-100',
        // 선택: On Click / Dissolve / Ease out / 75ms(ring 전환은 press-scale-large가 함께 맡음)
        'motion-reduce:before:transition-none',
        // 테두리: 기본 border-secondary, 선택 border-strong-lighter(안쪽 1px ring이라 크기 변동 없음)
        'ring-border-secondary ring-1 ring-inset has-checked:ring-border-strong-lighter',
        'has-disabled:cursor-not-allowed has-disabled:opacity-(--semantic-opacity-disabled) has-disabled:ring-transparent',
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
          className="typography-body-3-semibold text-text-primary group-has-disabled:text-text-disabled"
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
