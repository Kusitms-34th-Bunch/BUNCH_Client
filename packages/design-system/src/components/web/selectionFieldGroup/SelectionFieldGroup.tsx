'use client';

import type { ComponentProps } from 'react';
import { LineAddSmallIcon } from '../../../icons';
import { cn } from '../../../utils';
import { SelectionField } from '../selectionField';

export type SelectionFieldGroupItem = {
  /** 행을 구분하는 값(콜백으로 돌려받음) */
  id: string;
  /** 고른 값(예: "서울특별시 여의도동"): 값과 지우기 버튼이 보임 */
  value: string;
};

export type SelectionFieldGroupProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 위에서부터 쌓을 고른 값들: 고르는 일은 "추가" 행을 눌러 호출하는 쪽의 검색 화면에서 하므로 빈 행은 없음 */
  items: readonly SelectionFieldGroupItem[];
  /** 어떤 필드인지 알려 주는 이름(예: "위치"), 화면에는 안 보이고 각 행 버튼의 접근성 이름 앞에 붙음 */
  fieldLabel?: string | undefined;
  /** 그룹의 접근성 이름: 주면 행들이 하나의 `group`으로 묶임 */
  groupLabel?: string | undefined;
  /** 행을 눌러 값을 바꾸러 갈 때 */
  onItemClick?: ((_id: string) => void) | undefined;
  /** 행의 지우기 버튼을 눌렀을 때 */
  onItemClear?: ((_id: string) => void) | undefined;
  /** 지우기 버튼의 접근성 이름을 만드는 함수(기본 "{값} 지우기"). 같은 값이 여러 행일 때 구별하도록 행 순서(0부터)도 받음 */
  clearLabel?: ((_value: string, _index: number) => string) | undefined;
  /** 주면 맨 아래에 "추가" 행이 나타나고 누르면 호출됨(장소 검색 화면을 여는 곳, 최대 개수에서는 호출하는 쪽이 주지 않음) */
  onAdd?: (() => void) | undefined;
  /** "추가" 행의 글자(기본 "추가") */
  addLabel?: string | undefined;
};

/**
 * 선택 필드 그룹(Figma `Selection Field Group`): 같은 종류의 값을 여러 개 고를 때 고른 값들을 `SelectionField` 행으로 한 카드에 쌓은 것
 * 값은 맨 아래 "추가" 행을 눌러 호출하는 쪽의 검색 화면에서 고르며, 고르기 전의 빈 행은 없음
 * 행 사이는 좌우 16px 안쪽의 흰 1px 선이고 맨 위·맨 아래 행만 모서리가 둥글며, `className`은 카드에 적용
 * 값의 보관·최대 개수·고르는 화면은 호출하는 쪽이 정하고 이 컴포넌트는 행을 그려 콜백만 부름
 */
export const SelectionFieldGroup = ({
  items,
  fieldLabel,
  groupLabel,
  onItemClick,
  onItemClear,
  clearLabel,
  onAdd,
  addLabel = '추가',
  className,
  ...props
}: SelectionFieldGroupProps) => {
  const rowCount = items.length + (onAdd ? 1 : 0);
  if (rowCount === 0) return null;

  // 맨 위·맨 아래 행만 모서리를 두고, 두 번째 행부터 위에 구분선을 그림(선은 행 높이에 포함되지 않음)
  // 행이 맞붙어 있어 포커스된 행을 위로 올려야 윤곽선이 다음 행에 가려지지 않음
  const rowClassName = (index: number) =>
    cn(
      'has-focus-visible:z-10',
      'before:bg-surface-primary before:absolute before:inset-x-4 before:top-0 before:h-px before:content-[""]',
      index === 0 && 'before:hidden',
      rowCount > 1 && index === 0 && 'rounded-b-none',
      rowCount > 1 && index === rowCount - 1 && 'rounded-t-none',
      rowCount > 1 && index > 0 && index < rowCount - 1 && 'rounded-none',
    );

  return (
    <div
      role={groupLabel ? 'group' : undefined}
      aria-label={groupLabel}
      className={cn('flex w-full flex-col', className)}
      {...props}
    >
      {items.map((item, index) => (
        <SelectionField
          key={item.id}
          label={item.value}
          selected
          fieldLabel={fieldLabel}
          clearLabel={clearLabel?.(item.value, index)}
          onFieldClick={() => onItemClick?.(item.id)}
          onClear={() => onItemClear?.(item.id)}
          className={rowClassName(index)}
        />
      ))}
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            'bg-surface-secondary rounded-r5 px-s7 py-s5 gap-s3 text-text-quaternary typography-body-3-regular relative flex h-11 w-full cursor-pointer touch-manipulation items-center text-left',
            'focus-visible:outline-border-brand focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2',
            rowClassName(rowCount - 1),
          )}
        >
          <LineAddSmallIcon aria-hidden="true" className="text-icon-quaternary shrink-0" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
};
