'use client';
/* eslint-disable react-refresh/only-export-components -- Compound API 부품을 객체 하나로 묶어 export */

import type { ReactNode } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils';

// Base UI 타입은 노출하지 않고 필요한 속성만 공개(ADR 009·014와 같은 원칙)
export type MenuTabsRootProps = {
  /** 선택된 탭 값(제어 컴포넌트) */
  value?: string | undefined;
  /** 처음 선택할 탭 값(비제어 컴포넌트) */
  defaultValue?: string | undefined;
  onValueChange?: ((_value: string) => void) | undefined;
  className?: string | undefined;
  children: ReactNode;
};
// 탭 묶음 이름 필수(이름 없는 tablist 방지)
export type MenuTabsListProps = {
  /** 방향키로 초점을 옮길 때 바로 선택할지. 기본 false(Enter·Space로 선택) */
  activateOnFocus?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
} & ({ 'aria-label': string } | { 'aria-labelledby': string });
export type MenuTabsTabProps = {
  value: string;
  /** 탭 이름(예: `팔로워`) */
  label: string;
  /** 이름 뒤 숫자(예: 120). 접근성 이름에도 포함 */
  count?: number | string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
};
export type MenuTabsIconTabProps = {
  value: string;
  /** 접근성 이름(아이콘만 보이므로 필수, 예: `사진`) */
  label: string;
  /** 선택 전 아이콘(Figma Line 아이콘, Medium 20px) */
  icon: ReactNode;
  /** 선택된 아이콘(Figma Fill 아이콘, Medium 20px) */
  selectedIcon: ReactNode;
  disabled?: boolean | undefined;
  className?: string | undefined;
};
export type MenuTabsPanelProps = {
  value: string;
  /** 선택되지 않아도 DOM에 유지(입력 상태 보존 등) */
  keepMounted?: boolean | undefined;
  className?: string | undefined;
  children?: ReactNode;
};

const Root = (props: MenuTabsRootProps) => <Tabs.Root {...props} />;

const List = ({ className, ...props }: MenuTabsListProps) => (
  <Tabs.List {...props} className={cn('flex', className)} />
);

const Tab = ({ label, count, className, ...props }: MenuTabsTabProps) => (
  <Tabs.Tab
    {...props}
    className={cn(
      'typography-body-1-medium text-text-tertiary gap-s4 px-padding-p11 inline-flex h-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center border-b-2 border-transparent',
      'data-disabled:cursor-not-allowed data-disabled:opacity-(--semantic-opacity-disabled)',
      'data-active:text-text-primary data-active:border-chip-gray-fg',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
      className,
    )}
  >
    <span>{label}</span>
    {/* 접근성 이름이 「이름 숫자」로 띄어 읽히도록 공백 문자 유지(gap은 화면 간격만 담당) */}
    {count !== undefined ? (
      <>
        {' '}
        <span>{count}</span>
      </>
    ) : null}
  </Tabs.Tab>
);

// 아이콘 탭(Figma `Menu Tap`): 선택되면 Fill 아이콘과 진한 1px 밑줄
const IconTab = ({ label, icon, selectedIcon, className, ...props }: MenuTabsIconTabProps) => (
  <Tabs.Tab
    {...props}
    aria-label={label}
    className={cn(
      'text-icon-quaternary px-padding-p4 py-padding-p5 group relative inline-flex h-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center',
      // 밑줄은 Figma처럼 높이 안쪽(40px)에 그림
      'after:bg-border-tertiary after:absolute after:inset-x-0 after:bottom-0 after:h-px',
      // 탭 전환: Dissolve / Ease out / 75ms(화면설계서 번치 메인 3번)
      'transition-colors duration-75 ease-[ease-out] after:transition-colors after:duration-75 after:ease-[ease-out] motion-reduce:transition-none motion-reduce:after:transition-none',
      'not-data-disabled:active:bg-overlay-hover',
      'data-disabled:after:bg-border-disabled data-disabled:cursor-not-allowed data-disabled:opacity-(--semantic-opacity-disabled)',
      'data-active:text-icon-tertiary data-active:after:bg-icon-tertiary',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
      className,
    )}
  >
    {/* 두 아이콘을 겹쳐 두고 투명도로 교차(Dissolve) */}
    <span className="grid *:col-start-1 *:row-start-1">
      <span
        aria-hidden="true"
        className="flex transition-opacity duration-75 ease-[ease-out] group-data-active:opacity-0 motion-reduce:transition-none"
      >
        {icon}
      </span>
      <span
        aria-hidden="true"
        className="flex opacity-0 transition-opacity duration-75 ease-[ease-out] group-data-active:opacity-100 motion-reduce:transition-none"
      >
        {selectedIcon}
      </span>
    </span>
  </Tabs.Tab>
);

const Panel = ({ className, ...props }: MenuTabsPanelProps) => (
  // 패널은 tabIndex 0이라 키보드 초점을 받으므로 초점 표시 유지
  <Tabs.Panel
    {...props}
    className={cn(
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
      className,
    )}
  />
);

/** 이름·숫자 탭(Figma `Menu_Tap`)과 아이콘 탭(Figma `Menu Tap`): Base UI Tabs가 탭 역할·방향키 이동·패널 연결 담당 */
export const MenuTabs = { Root, List, Tab, IconTab, Panel };
