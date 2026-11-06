import { useEffect, useId, useState, type ComponentProps, type ReactNode } from 'react';
import { LineChevronDownMediumIcon, LineChevronUpMediumIcon } from '../../../icons';
import { cn } from '../../../utils';
import { ProfileImage } from '../profileImage';

// 열고 닫는 전환 시간(Figma 화면 설계서 MY 탈퇴하기: Smart Animate, Ease out, 200ms)
const PANEL_DURATION_MS = 200;

export type BunchAccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;

export type BunchAccordionProps = Omit<ComponentProps<'div'>, 'title' | 'onChange'> & {
  /** 번치 이름. 펼침 버튼의 접근성 이름 */
  name: string;
  /** 번치 대표 이미지 주소. 없으면 배경색 원만 표시 */
  imageSrc?: string | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((_open: boolean) => void) | undefined;
  /** 비활성: 카드 전체 40%, 누를 수 없음 */
  disabled?: boolean | undefined;
  /** 안에서 무언가 고른 상태(Figma `Status=Selected`). 접혔을 때만 연한 브랜드 배경·테두리로 표시 */
  selected?: boolean | undefined;
  /** 고른 값 낭독(예: 「새 관리자: 서현」). `selected`를 쓰면 함께 줌(빠지면 선택이 색으로만 전달됨) */
  selectedLabel?: string | undefined;
  /** 헤더를 감싸는 제목 수준, 기본값 3 */
  headingLevel?: BunchAccordionHeadingLevel | undefined;
  /** 펼쳤을 때 구분선 아래에 보이는 내용(없음은 undefined·null·false), 여백·모양은 호출하는 쪽 담당 */
  children?: ReactNode;
};

/**
 * 번치 하나를 펼치고 접는 카드(Figma `Bunch_Accordion`·`Bunch_Accordion_Status`): 번치 이미지·이름·쉐브론
 * 펼치면 구분선과 내용이 200ms로 나타나며 `prefers-reduced-motion`에서는 즉시 전환
 * 열림은 `open`(controlled) 또는 `defaultOpen`(uncontrolled), 둘 사이 전환은 미지원
 */
export const BunchAccordion = ({
  name,
  imageSrc,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  selected = false,
  selectedLabel,
  headingLevel = 3,
  children,
  className,
  ...props
}: BunchAccordionProps) => {
  const id = useId();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  // 닫는 전환이 끝날 때까지 내용을 유지(그동안은 inert로 포커스·읽기에서 제외)
  const [mounted, setMounted] = useState(isOpen);
  if (isOpen && !mounted) setMounted(true);
  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => setMounted(false), PANEL_DURATION_MS + 50);
    return () => clearTimeout(timer);
  }, [isOpen]);
  const hasPanel = children !== undefined && children !== null && children !== false;
  const Heading = `h${headingLevel}` as const;
  const Chevron = isOpen ? LineChevronUpMediumIcon : LineChevronDownMediumIcon;
  // 펼치면 안의 선택 표시(라디오 등)가 보이므로 접혔을 때만 카드에 반영
  const showSelected = selected && !isOpen;

  const toggle = () => {
    const next = !isOpen;
    setInnerOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn(
        // 선택 표시 전환(화면 설계서: On click / Dissolve / Ease out / 200ms)
        'rounded-r4 overflow-hidden outline -outline-offset-1 transition-colors duration-200 ease-out motion-reduce:transition-none',
        showSelected
          ? 'bg-surface-brand-subtle-1 outline-border-brand-subtle'
          : 'bg-surface-primary outline-border-tertiary',
        disabled && 'opacity-(--semantic-opacity-disabled)',
        className,
      )}
      {...props}
    >
      <Heading className="m-0">
        <button
          type="button"
          id={`${id}-header`}
          aria-expanded={isOpen}
          aria-controls={hasPanel ? `${id}-panel` : undefined}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            'px-padding-p6 py-padding-p5 gap-s3 relative isolate flex w-full cursor-pointer touch-manipulation items-center text-left disabled:cursor-not-allowed',
            // 눌림은 글자 뒤 배경 층에서 겹침 처리
            'before:bg-overlay-hover before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out enabled:active:before:opacity-100 motion-reduce:before:transition-none',
            'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
          )}
        >
          <ProfileImage src={imageSrc} size="S" className="border-border-tertiary border" />
          <span className="typography-body-2-medium text-text-secondary min-w-0 flex-1 truncate">
            {name}
            {selected && selectedLabel ? (
              <span className="sr-only">{`, ${selectedLabel}`}</span>
            ) : null}
          </span>
          {/* 선택 쉐브론 #777FF2에 맞는 semantic 아이콘 토큰이 없어 primitive 색(icon-brand는 #454EDF) */}
          <Chevron
            aria-hidden="true"
            className={cn(
              'shrink-0',
              showSelected ? 'text-primitive-bunch-400' : 'text-icon-quaternary',
            )}
          />
        </button>
      </Heading>
      {hasPanel ? (
        <div
          id={`${id}-panel`}
          role="region"
          aria-labelledby={`${id}-header`}
          hidden={!mounted}
          inert={!isOpen || disabled}
          className={cn(
            'grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none starting:grid-rows-[0fr]',
            isOpen ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="gap-s4 pt-s4 flex flex-col">
              <div
                aria-hidden="true"
                className="bg-border-tertiary mx-padding-p5 h-px forced-colors:bg-[CanvasText]"
              />
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
