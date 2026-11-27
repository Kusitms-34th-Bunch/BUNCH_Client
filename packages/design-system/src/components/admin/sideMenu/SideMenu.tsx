import type { ReactElement, ReactNode } from 'react';
import { tv } from '../../../utils';
import { ColorBadge } from '../../core/colorBadge';

/** `renderLink`가 받는 값: 링크 요소에 그대로 붙여 같은 모양으로 그림 */
export type SideMenuLinkState = {
  className: string;
  'aria-current': 'page' | undefined;
  children: ReactNode;
};

// 이동할 곳 필수: 기본 `<a>`의 `href` 또는 호출자의 라우터 링크(`renderLink`) 중 하나(href 없는 <a>는 링크로 읽히지 않고 초점도 못 받음)
type SideMenuTarget =
  | {
      /** 기본 `<a>`의 이동 주소 */
      href: string;
      renderLink?: never;
    }
  | {
      href?: never;
      /** 링크를 그림(호출자의 라우터 `Link`). 받은 값을 링크 요소에 그대로 전달 */
      renderLink: (_state: SideMenuLinkState) => ReactElement;
    };

export type SideMenuProps = SideMenuTarget & {
  /** 이름 앞 아이콘(Figma Line 아이콘 Medium 20px, 예: `LineAlertMediumIcon`). 색은 상태에 따라 지정 */
  icon: ReactNode;
  /** 메뉴 이름(예: `신고 조회 및 처리`) */
  children: string;
  /** 오른쪽 배지의 건수(예: 처리 대기 12). 없으면 배지 숨김 */
  count?: number | undefined;
  /** 현재 화면이면 true */
  selected?: boolean | undefined;
  className?: string | undefined;
};

const sideMenu = tv({
  slots: {
    root: [
      'gap-s3 px-s3 py-s4 rounded-r2 flex h-12 w-full cursor-pointer items-center justify-between',
      // 윤곽은 바깥쪽: 선택 배경(#535A61) 안쪽에 그리면 brand 윤곽과 대비가 약 1.1:1로 보이지 않음
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      // 선택·Hover 배경은 제자리에서 짧게 바뀜(150ms ease-out, 2026-11-27 사용자 결정). 동작 줄이기면 바로 바뀜
      'transition-colors duration-150 ease-out motion-reduce:transition-none',
    ],
    // 글자·아이콘 색도 배경과 같은 시간에 바뀜
    icon: 'inline-flex shrink-0 transition-colors duration-150 ease-out motion-reduce:transition-none',
    label:
      'typography-body-2-medium min-w-0 truncate transition-colors duration-150 ease-out motion-reduce:transition-none',
  },
  variants: {
    selected: {
      // Hover 덮개는 배경에만(Figma Hover 글자색은 Default 토큰 그대로). 현재 화면은 Hover 모양 없음
      false: {
        root: 'hover:bg-overlay-hover',
        icon: 'text-icon-secondary',
        label: 'text-text-secondary',
      },
      true: {
        root: 'bg-surface-inversed-lighter',
        icon: 'text-icon-inversed',
        label: 'text-text-inversed',
      },
    },
  },
  defaultVariants: { selected: false },
});

/**
 * 어드민 왼쪽 메뉴 항목(Figma `어드민 컴포넌트` > `Side Menu`): 아이콘 + 이름 + 건수 배지, Default·Hover·Selected
 * 화면 이동이라 링크로 그림. 현재 화면은 `aria-current="page"`, 메뉴 묶음(`<nav>`)은 호출자 담당
 */
export const SideMenu = ({
  icon,
  children,
  count,
  selected = false,
  href,
  renderLink,
  className,
}: SideMenuProps) => {
  const styles = sideMenu({ selected });
  const content = (
    <>
      <span className="gap-s3 flex min-w-0 items-center">
        <span aria-hidden="true" className={styles.icon()}>
          {icon}
        </span>
        <span className={styles.label()}>{children}</span>
      </span>
      {count !== undefined ? (
        <>
          {/* 접근성 이름이 「이름 건수」로 띄어 읽히도록 공백 문자 유지 */}{' '}
          <ColorBadge variant="weak" color="pink" size="lg">
            {count}
          </ColorBadge>
        </>
      ) : null}
    </>
  );
  const state: SideMenuLinkState = {
    className: styles.root({ className }),
    'aria-current': selected ? 'page' : undefined,
    children: content,
  };

  return renderLink ? (
    renderLink(state)
  ) : (
    <a href={href} className={state.className} aria-current={state['aria-current']}>
      {content}
    </a>
  );
};
