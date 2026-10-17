'use client';

import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';
import { useBottomNavigationGesture } from './useBottomNavigationGesture.internal';

export type BottomNavigationItem = {
  id: string;
  /** 보이는 라벨이자 접근성 이름 */
  label: string;
  /** 미선택 아이콘(Line, 24px), 접근성 이름은 `label`로 제공 */
  icon: ReactNode;
  /** 선택 아이콘(Fill, 24px), 접근성 트리에서 제외 */
  selectedIcon: ReactNode;
};

export type BottomNavigationItemState = {
  selected: boolean;
  /** 항목 요소에 적용할 크기·텍스트 색·포커스 스타일 */
  className: string;
  /** 항목 요소의 children으로 사용할 아이콘·라벨 */
  children: ReactNode;
  'aria-current': 'page' | undefined;
};

export type BottomNavigationProps = Omit<ComponentProps<'nav'>, 'children' | 'aria-label'> & {
  /** 막대의 접근성 이름(예: "주요 메뉴") */
  'aria-label': string;
  items: BottomNavigationItem[];
  /** 선택된 항목의 id, 목록에 없으면 모두 미선택 처리 */
  selectedId: string;
  /** 반투명 글라스 효과(기본 false), 디자인 외 제안은 결정 기록 011 참고 */
  glass?: boolean;
  /** 기본 button의 선택 콜백, `renderItem` 사용 시 호출 제외 */
  // eslint-disable-next-line unused-imports/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  onItemSelect?: (id: string) => void;
  /** 항목 렌더링 재정의(예: 링크), 기본 요소는 button */
  // eslint-disable-next-line unused-imports/no-unused-vars -- 함수 type의 매개변수 이름은 문서용
  renderItem?: (item: BottomNavigationItem, state: BottomNavigationItemState) => ReactNode;
};

// 글라스 효과의 선택 근거는 docs/decisions/records/011-bottom-navigation-glass-by-platform.md 참고
const glassBar =
  'bg-surface-primary/60 backdrop-blur-sm backdrop-saturate-200 shadow-[0_0_24px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.5)]';
const solidBar = 'bg-surface-primary shadow-navi-bar';
// 글라스 배경 위 선택 영역 구분을 위한 회색 반투명 적용
const selectedPill = 'bg-surface-secondary';
const selectedPillGlass = 'bg-[rgba(120,120,128,0.16)]';

const itemBase =
  'flex h-s20 w-s24 max-w-full cursor-pointer touch-manipulation flex-col items-center justify-center gap-s2 rounded-full py-s3 typography-caption-1-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand';

/** 항목·선택·렌더링은 호출자, 위치·Safe Area는 PageShell 소유 */
export const BottomNavigation = ({
  items,
  selectedId,
  glass = false,
  onItemSelect,
  renderItem,
  className,
  ...props
}: BottomNavigationProps) => {
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const { listRef, pillRef, scrub, visualIndex, isEnlarged, navProps } = useBottomNavigationGesture(
    {
      itemCount: items.length,
      selectedIndex,
    },
  );

  return (
    <nav
      className={cn('p-s2 w-full touch-pan-y rounded-full', glass ? glassBar : solidBar, className)}
      {...navProps}
      {...props}
    >
      <div className="relative">
        {selectedIndex >= 0 || scrub ? (
          // 레이아웃 재계산 없이 이동하도록 transform 사용
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 flex justify-center ease-in-out motion-reduce:transition-none',
              scrub ? 'transition-none' : 'transition-transform duration-200',
            )}
            style={{
              width: `${100 / items.length}%`,
              transform: scrub
                ? `translateX(${scrub.px}px)`
                : `translateX(${selectedIndex * 100}%)`,
            }}
          >
            <span
              ref={pillRef}
              className={cn(
                'h-s20 w-s24 max-w-full rounded-full transition-transform duration-200 ease-in-out motion-reduce:transition-none',
                isEnlarged ? 'scale-[1.12] motion-reduce:scale-100' : 'scale-100',
                glass ? selectedPillGlass : selectedPill,
              )}
            />
          </div>
        ) : null}
        <ul ref={listRef} className="relative flex items-center">
          {items.map((item, index) => {
            // 끌기 미리보기와 실제 선택(aria-current) 분리
            const isSelected = index === visualIndex;
            const state: BottomNavigationItemState = {
              selected: isSelected,
              className: cn(itemBase, isSelected ? 'text-text-primary' : 'text-text-tertiary'),
              children: (
                <>
                  <span aria-hidden="true" className="inline-flex">
                    {isSelected ? item.selectedIcon : item.icon}
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </>
              ),
              'aria-current': item.id === selectedId ? 'page' : undefined,
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
      </div>
    </nav>
  );
};
