import { Select } from '@base-ui/react/select';
import {
  LineCheckSmallIcon,
  LineChevronDownMediumIcon,
  LineChevronDownSmallIcon,
  LineChevronUpMediumIcon,
  LineChevronUpSmallIcon,
} from '../../../icons';
import { tv } from '../../../utils';

export type DropdownItem = { value: string; label: string };
export type DropdownSize = 'lg' | 'sm';

// Base UI 타입은 노출하지 않고 필요한 속성만 공개(MenuTabs와 같은 원칙). 보이는 라벨이 없을 수 있어 이름 필수
export type DropdownProps = {
  /** 고를 수 있는 항목(값·보이는 글자) */
  items: readonly DropdownItem[];
  /** 선택된 값(제어 컴포넌트). 없으면 null */
  value: string | null;
  onValueChange: (_value: string | null) => void;
  /** 선택 전 글자(예: "신고 사유를 선택해주세요") */
  placeholder?: string | undefined;
  /** 크기: 폼 입력 `lg`(높이 47px, Figma Size=L), 목록 필터 `sm`(33px, Size=S). 기본 `lg` */
  size?: DropdownSize | undefined;
  disabled?: boolean | undefined;
  /** form 제출 이름 */
  name?: string | undefined;
  /** 트리거에 적용(폭은 부모를 채움) */
  className?: string | undefined;
} & ({ 'aria-label': string } | { 'aria-labelledby': string });

const dropdown = tv({
  slots: {
    trigger: [
      'bg-surface-primary border-border-secondary group flex w-full cursor-pointer items-center border text-start',
      'data-popup-open:border-border-strong',
      'disabled:bg-surface-disabled disabled:border-border-disabled disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
    ],
    // 선택 전은 연한 글자, 선택 후는 Regular, 열린 동안은 SemiBold(Figma Placeholder·Filled·Open)
    value: 'typography-body-3-semibold min-w-0 flex-1 truncate',
    // 화살표 색: 선택 전·비활성 quaternary, 선택 후 tertiary, 열린 동안 secondary
    icon: 'group-data-popup-open:text-icon-secondary flex shrink-0',
    popup: [
      'bg-surface-primary gap-s1 flex max-h-(--available-height) w-(--anchor-width) flex-col overflow-y-auto outline-none',
      // 그림자는 토큰이 없어 Figma 값 그대로(토큰 추가 필요)
      'shadow-[0px_6px_10px_0px_rgba(0,0,0,0.07)]',
    ],
    item: [
      'bg-surface-primary pl-padding-p6 pr-padding-p5 gap-s4 flex cursor-pointer items-center justify-between outline-none select-none',
      'typography-body-3-regular text-text-primary',
      // Figma Pressed: 흰 바탕 위 overlay-hover. 열 때 Base UI가 선택 항목에 초점을 줘도 덮개가 칠해지지 않게
      // data-highlighted 대신 마우스(hover)·키보드 이동(focus-visible)일 때만 표시
      'hover:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
      'focus-visible:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
      // 키보드로 옮긴 항목은 덮개만으로 약해 안쪽 윤곽도 그림
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
      'data-selected:typography-body-3-semibold',
    ],
  },
  variants: {
    size: {
      lg: {
        trigger: 'px-padding-p8 rounded-r5 gap-s4 h-11.75',
        popup: 'p-s4 rounded-r8',
        item: 'rounded-r4 h-10.25',
      },
      sm: {
        trigger: 'px-padding-p6 rounded-r3 h-8.25 justify-between',
        popup: 'p-padding-p2 rounded-r5',
        item: 'rounded-r3 h-8.25',
      },
    },
    filled: {
      true: { value: 'text-text-secondary', icon: 'text-icon-tertiary' },
      false: { value: 'text-text-quinary', icon: 'text-icon-quaternary' },
    },
  },
  compoundVariants: [
    // 선택된 값은 닫혀 있을 때만 Regular
    { filled: true, class: { value: 'not-group-data-popup-open:typography-body-3-regular' } },
  ],
  defaultVariants: { size: 'lg', filled: false },
});

/**
 * 어드민 드롭다운(Figma `어드민 컴포넌트` > `Dropdown`·`Dropdown/Trigger`·`Dropdown/Option`): L·S 크기, Placeholder·Filled·Open·Disabled
 * listbox 역할·방향키 이동·입력 글자로 찾기·바깥 누르면 닫기는 Base UI Select 담당
 */
export const Dropdown = ({
  items,
  value,
  onValueChange,
  placeholder,
  size = 'lg',
  disabled,
  name,
  className,
  ...labelProps
}: DropdownProps) => {
  const selectedLabel = items.find((item) => item.value === value)?.label;
  const styles = dropdown({ size, filled: selectedLabel !== undefined });
  const ChevronDown = size === 'lg' ? LineChevronDownSmallIcon : LineChevronDownMediumIcon;
  const ChevronUp = size === 'lg' ? LineChevronUpSmallIcon : LineChevronUpMediumIcon;

  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(next ?? null)}
      disabled={disabled}
      name={name}
    >
      <Select.Trigger {...labelProps} className={styles.trigger({ className })}>
        <Select.Value className={styles.value()}>{() => selectedLabel ?? placeholder}</Select.Value>
        <span aria-hidden="true" className={styles.icon()}>
          <ChevronDown className="group-data-popup-open:hidden" />
          <ChevronUp className="hidden group-data-popup-open:block" />
        </span>
      </Select.Trigger>
      <Select.Portal>
        {/* 트리거 아래 4px(Figma 간격 spacing-s2)에 트리거 폭으로 펼침 */}
        <Select.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50">
          <Select.Popup className={styles.popup()}>
            {items.map((item) => (
              <Select.Item key={item.value} value={item.value} className={styles.item()}>
                <Select.ItemText className="min-w-0 truncate">{item.label}</Select.ItemText>
                <Select.ItemIndicator className="text-icon-primary flex shrink-0">
                  <LineCheckSmallIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
};
