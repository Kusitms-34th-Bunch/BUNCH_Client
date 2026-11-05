import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { LineChevronRightMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

/** `renderLink`가 받는 값: 링크 요소에 그대로 붙여 같은 모양으로 그림 */
export type MenuLabelLinkState = { className: string; children: ReactNode };

type MenuLabelBaseProps = {
  /** 접근성 이름이 되는 글자 */
  children: ReactNode;
  /** 글자 앞 장식 아이콘 20px(Figma `Show Left Icon`, 예: 휴지통). 접근성 이름 제외 */
  leftIcon?: ReactNode;
  /** 오른쪽 화살표 표시(Figma `Show Right Icon`, 기본 표시) */
  showChevron?: boolean;
  className?: string | undefined;
};

// 링크로 그리면 버튼 속성(disabled·onClick 등)이 적용되지 않으므로 타입에서 함께 쓰지 못하게 나눔
export type MenuLabelButtonProps = MenuLabelBaseProps &
  Omit<ComponentProps<'button'>, 'children' | 'type' | 'className'> & { renderLink?: undefined };
export type MenuLabelLinkProps = MenuLabelBaseProps & {
  /** 화면 이동 항목이면 링크로 그림(새 탭 열기·가운데 클릭). 비활성 없음 */
  renderLink: (_state: MenuLabelLinkState) => ReactElement;
};
export type MenuLabelProps = MenuLabelButtonProps | MenuLabelLinkProps;

/**
 * 메뉴 한 줄(Figma `Menu Label`): 다른 화면·동작으로 넘어가는 목록 항목. 앞 아이콘·오른쪽 화살표는 선택
 * 팝오버 메뉴의 `MenuItem`(role="menuitem")과 달리 일반 버튼, `renderLink`면 링크. 누르는 동안 overlay-hover(10%)
 */
export const MenuLabel = (props: MenuLabelProps) => {
  const { children, className, leftIcon, showChevron = true } = props;
  const state: MenuLabelLinkState = {
    className: cn(
      'rounded-r4 px-s2 py-padding-p5 gap-s4 group relative isolate flex w-full cursor-pointer touch-manipulation items-center justify-between text-left',
      'before:rounded-r4 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
      // 비활성은 눌림 없이 전체 40%(Figma Disabled)
      'not-disabled:active:before:opacity-100 disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    ),
    children: (
      <>
        <span className="gap-s2 flex min-w-0 items-center">
          {leftIcon ? (
            <span
              aria-hidden="true"
              className="text-icon-quaternary group-disabled:text-icon-disabled flex shrink-0"
            >
              {leftIcon}
            </span>
          ) : null}
          <span className="typography-body-2-medium text-text-secondary group-disabled:text-text-disabled min-w-0 wrap-break-word break-keep">
            {children}
          </span>
        </span>
        {showChevron ? (
          <LineChevronRightMediumIcon className="text-icon-quaternary group-disabled:text-icon-disabled shrink-0" />
        ) : null}
      </>
    ),
  };

  if (props.renderLink) return props.renderLink(state);
  const {
    children: _children,
    className: _className,
    leftIcon: _leftIcon,
    showChevron: _showChevron,
    renderLink: _renderLink,
    ...buttonProps
  } = props;
  return (
    <button type="button" {...buttonProps} className={state.className}>
      {state.children}
    </button>
  );
};
