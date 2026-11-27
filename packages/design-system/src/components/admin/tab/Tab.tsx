import { Tabs } from '@base-ui/react/tabs';
import { cn } from '../../../utils';

// Base UI 타입은 노출하지 않고 필요한 속성만 공개(MenuTabs와 같은 원칙)
export type TabProps = {
  /** 탭 값. `TabList`의 `value`와 같으면 선택 */
  value: string;
  /** 탭 이름(예: `접수`) */
  children: string;
  /** 이름 뒤 건수(예: 12). 접근성 이름에도 포함 */
  count?: number | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
};

/**
 * 어드민 탭(Figma `어드민 컴포넌트` > `Tab`): 이름 + 건수, Default·Hover·Selected·Disabled
 * `TabList` 안에서만 사용. 탭 역할·선택 상태·방향키 이동은 Base UI Tabs 담당
 */
export const Tab = ({ children, count, className, ...props }: TabProps) => (
  <Tabs.Tab
    {...props}
    className={cn(
      'gap-s2 px-padding-p8 py-padding-p1 relative inline-flex shrink-0 cursor-pointer items-end whitespace-nowrap',
      // Hover 덮개는 글자 위까지 덮어 글자도 함께 어둡게(Figma Hover 글자색 = 토큰 색 + 검정 10%). 선택·비활성 탭은 Hover 모양 없음
      'before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:opacity-0',
      'not-data-active:not-data-disabled:hover:before:opacity-100',
      // 선택 선은 TabList의 Indicator 하나가 선택된 탭 아래로 옮겨 다니며 그림(탭 높이 31px 안쪽)
      'data-disabled:cursor-not-allowed data-disabled:opacity-(--semantic-opacity-disabled)',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:-outline-offset-2',
      className,
    )}
  >
    <span className="typography-heading-2-medium text-text-secondary">{children}</span>
    {/* 접근성 이름이 「이름 건수」로 띄어 읽히도록 공백 문자 유지(gap은 화면 간격만 담당) */}
    {count !== undefined ? (
      <>
        {' '}
        <span className="typography-body-3-regular text-text-tertiary">{count}</span>
      </>
    ) : null}
  </Tabs.Tab>
);
