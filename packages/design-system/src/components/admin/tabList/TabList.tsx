import type { ReactNode } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils';

// 탭 묶음 이름 필수(이름 없는 tablist 방지)
export type TabListProps = {
  /** 선택된 탭 값(제어 컴포넌트, 예: URL 검색 조건의 값) */
  value: string;
  onValueChange: (_value: string) => void;
  /** 방향키로 초점을 옮길 때 바로 선택할지. 기본 false(Enter·Space로 선택) */
  activateOnFocus?: boolean | undefined;
  className?: string | undefined;
  /** `Tab` 목록 */
  children: ReactNode;
} & ({ 'aria-label': string } | { 'aria-labelledby': string });

/**
 * 어드민 탭 묶음: `Tab`을 감싸는 tablist
 * 방향키(←→)·Home·End로 탭 사이 초점 이동, 선택은 Enter·Space(Base UI Tabs 담당)
 */
export const TabList = ({
  value,
  onValueChange,
  activateOnFocus,
  className,
  children,
  ...labelProps
}: TabListProps) => (
  // Base UI는 탭 값 타입이 넓어 문자열 값만 받도록 좁힘
  <Tabs.Root value={value} onValueChange={(next) => onValueChange(String(next))}>
    <Tabs.List
      {...labelProps}
      activateOnFocus={activateOnFocus}
      className={cn('relative flex items-end', className)}
    >
      {children}
      {/* 선택 선(Figma 2px border-brand)은 하나를 선택된 탭 위치로 옮김(web MenuTabs와 같은 250ms ease-out, 2026-11-27 사용자 결정) */}
      <Tabs.Indicator
        className={cn(
          'bg-border-brand pointer-events-none absolute bottom-0 left-(--active-tab-left) h-0.5 w-(--active-tab-width)',
          'transition-[left,width] duration-250 ease-out motion-reduce:transition-none',
          // 강제 색상 모드는 배경색을 덮으므로 시스템 글자색으로 그림
          'forced-colors:bg-[CanvasText] forced-colors:forced-color-adjust-none',
        )}
      />
    </Tabs.List>
  </Tabs.Root>
);
