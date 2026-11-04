import { useId } from 'react';
import { cn } from '../../../utils';
import { Toggle, type ToggleProps } from '../../core/toggle';

export type ToggleListItemProps = ToggleProps & {
  /** 설정 이름. 토글의 접근성 이름 */
  title: string;
  /** 제목 아래 보조 설명. 토글의 설명(`aria-describedby`)으로 연결 */
  description?: string | undefined;
};

/**
 * 제목·설명과 토글을 한 줄로 묶은 설정 행(Figma `Toggle_List`): 행 전체가 토글의 label이라 어디를 눌러도 켜고 끔
 * `className`·`style`은 행에, 나머지 props는 토글 input에 전달. 비활성이면 행 전체를 40%로 흐리게
 */
export const ToggleListItem = ({
  title,
  description,
  className,
  style,
  'aria-describedby': ariaDescribedBy,
  ...props
}: ToggleListItemProps) => {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <label
      style={style}
      className={cn(
        'group/toggle-row gap-s6 px-padding-p4 py-padding-p3 flex w-full cursor-pointer touch-manipulation items-center',
        'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-(--semantic-opacity-disabled)',
        className,
      )}
    >
      <span className="gap-s2 flex min-w-0 flex-1 flex-col">
        <span
          id={titleId}
          className="typography-body-2-medium text-text-secondary group-has-[input:disabled]/toggle-row:text-text-disabled wrap-break-word break-keep"
        >
          {title}
        </span>
        {description && (
          <span
            id={descriptionId}
            className="typography-caption-1-regular text-text-tertiary group-has-[input:disabled]/toggle-row:text-text-disabled wrap-break-word break-keep"
          >
            {description}
          </span>
        )}
      </span>
      <Toggle
        aria-labelledby={titleId}
        aria-describedby={
          [description && descriptionId, ariaDescribedBy].filter(Boolean).join(' ') || undefined
        }
        {...props}
      />
    </label>
  );
};
