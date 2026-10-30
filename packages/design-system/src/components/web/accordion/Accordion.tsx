import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { LineChevronDownSmallIcon, LineChevronUpSmallIcon } from '../../../icons';
import { cn } from '../../../utils';

export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;

export type AccordionProps = Omit<ComponentProps<'div'>, 'title' | 'onChange'> & {
  title: string;
  /** 있으면 제목이 18px SemiBold로 커지고 설명 줄을 보임(Figma `Description=True`) */
  description?: string | undefined;
  /** 제목 옆 브랜드색 개수(예: "9장"), 그대로 그림 */
  count?: ReactNode | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((_open: boolean) => void) | undefined;
  /** 헤더를 감싸는 제목 수준, 기본값 3 */
  headingLevel?: AccordionHeadingLevel | undefined;
  /** 펼쳤을 때 보이는 내용(없음은 undefined·null·false), 모양은 호출하는 쪽 담당 */
  children?: ReactNode;
};

/**
 * 눌러서 내용을 펼치고 접는 목록 항목 헤더(Figma `Accordion`): 제목·개수·설명·쉐브론
 * 열림은 `open`(controlled) 또는 `defaultOpen`(uncontrolled), 둘 사이 전환은 미지원, `title`은 글자 prop
 */
export const Accordion = ({
  title,
  description,
  count,
  open,
  defaultOpen = false,
  onOpenChange,
  headingLevel = 3,
  children,
  className,
  ...props
}: AccordionProps) => {
  const id = useId();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  const hasPanel = children !== undefined && children !== null && children !== false;
  const Heading = `h${headingLevel}` as const;
  const Chevron = isOpen ? LineChevronUpSmallIcon : LineChevronDownSmallIcon;
  const hasDescription = Boolean(description);
  const titleStyle = hasDescription ? 'typography-heading-2-semibold' : 'typography-body-1-medium';

  const toggle = () => {
    const next = !isOpen;
    setInnerOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={className} {...props}>
      <Heading className="m-0">
        <button
          type="button"
          id={`${id}-header`}
          aria-expanded={isOpen}
          aria-controls={hasPanel ? `${id}-panel` : undefined}
          aria-labelledby={count === undefined ? `${id}-title` : `${id}-title ${id}-count`}
          aria-describedby={hasDescription ? `${id}-description` : undefined}
          onClick={toggle}
          className={cn(
            'p-s8 gap-s2 relative isolate flex w-full cursor-pointer touch-manipulation flex-col text-left',
            hasDescription || isOpen ? 'bg-surface-secondary' : 'bg-surface-primary',
            // 눌림은 글자 뒤 배경 층에서 겹침 처리
            'before:bg-overlay-hover before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out active:before:opacity-100 motion-reduce:before:transition-none',
            'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
          )}
        >
          <span className="flex w-full items-center gap-8.75">
            <span
              className={cn('gap-s2 text-text-primary flex min-w-0 flex-1 items-start', titleStyle)}
            >
              <span id={`${id}-title`} className="min-w-0 truncate">
                {title}
              </span>
              {count === undefined ? null : (
                <span id={`${id}-count`} className="text-text-brand shrink-0">
                  {count}
                </span>
              )}
            </span>
            <Chevron aria-hidden="true" className="text-icon-primary shrink-0" />
          </span>
          {hasDescription ? (
            <span
              id={`${id}-description`}
              className="typography-body-4-regular text-text-tertiary w-full"
            >
              {description}
            </span>
          ) : null}
        </button>
      </Heading>
      {hasPanel ? (
        <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-header`} hidden={!isOpen}>
          {children}
        </div>
      ) : null}
    </div>
  );
};
