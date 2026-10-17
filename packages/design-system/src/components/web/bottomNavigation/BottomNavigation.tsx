import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type BottomNavigationItem = {
  id: string;
  /** 보이는 라벨이자 접근성 이름 */
  label: string;
  /** 선택되지 않았을 때 아이콘(Line, 24px). 장식이라 접근성에서 숨겨지며 이름은 `label`이 맡는다 */
  icon: ReactNode;
  /** 선택됐을 때 아이콘(Fill, 24px). 장식이라 접근성에서 숨겨진다 */
  selectedIcon: ReactNode;
};

export type BottomNavigationItemState = {
  selected: boolean;
  /** 항목 요소에 그대로 붙인다(알약 크기·색·포커스 윤곽선) */
  className: string;
  /** 아이콘과 라벨. 항목 요소의 children으로 그대로 넣는다 */
  children: ReactNode;
  'aria-current': 'page' | undefined;
};

export type BottomNavigationProps = Omit<ComponentProps<'nav'>, 'children' | 'aria-label'> & {
  /** 막대의 접근성 이름(예: "주요 메뉴") */
  'aria-label': string;
  items: BottomNavigationItem[];
  /** 선택된 항목의 id. 목록에 없으면 모두 미선택으로 보인다 */
  selectedId: string;
  /** 기본 button 항목을 눌렀을 때 호출한다. `renderItem`을 쓰면 호출하지 않는다 */
  // eslint-disable-next-line unused-imports/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  onItemSelect?: (id: string) => void;
  /** 항목을 어떤 요소로 그릴지 정한다(예: 링크). 기본은 native button */
  // eslint-disable-next-line unused-imports/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  renderItem?: (item: BottomNavigationItem, state: BottomNavigationItemState) => ReactNode;
};

const itemBase =
  'flex h-s20 w-s24 max-w-full cursor-pointer touch-manipulation flex-col items-center justify-center gap-s2 rounded-full py-s3 typography-caption-1-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand';

/**
 * 하단 탭 막대: 알약형 흰 막대 안에 항목을 균등 배치하고 선택 항목을 알약 배경으로 표시
 * 항목 문구·경로·현재 탭 판정은 호출하는 쪽이 정하고, 위치와 Safe Area는 PageShell이 맡음
 */
export const BottomNavigation = ({
  items,
  selectedId,
  onItemSelect,
  renderItem,
  className,
  ...props
}: BottomNavigationProps) => (
  <nav
    className={cn('bg-surface-primary p-s2 shadow-navi-bar w-full rounded-full', className)}
    {...props}
  >
    <ul className="flex items-center">
      {items.map((item) => {
        const selected = item.id === selectedId;
        const state: BottomNavigationItemState = {
          selected,
          className: cn(
            itemBase,
            selected ? 'bg-surface-secondary text-text-primary' : 'text-text-tertiary',
          ),
          children: (
            <>
              <span aria-hidden="true" className="inline-flex">
                {selected ? item.selectedIcon : item.icon}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </>
          ),
          'aria-current': selected ? 'page' : undefined,
        };

        return (
          <li key={item.id} className="flex min-w-0 flex-1 justify-center">
            {renderItem ? (
              renderItem(item, state)
            ) : (
              <button
                type="button"
                className={state.className}
                aria-current={state['aria-current']}
                onClick={() => onItemSelect?.(item.id)}
              >
                {state.children}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  </nav>
);
