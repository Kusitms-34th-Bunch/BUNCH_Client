import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { cn } from '../../../utils';

/** `renderLink`가 받는 값: 링크 요소에 그대로 붙여 같은 모양으로 그림 */
export type TextButtonUnderlineLinkState = { className: string; children: ReactNode };

type TextButtonUnderlineBaseProps = {
  /** 접근성 이름이 되는 글자 */
  children: ReactNode;
  className?: string | undefined;
};

// 링크로 그리면 버튼 속성(disabled·onClick 등)이 적용되지 않으므로 타입에서 함께 쓰지 못하게 나눔
export type TextButtonUnderlineButtonProps = TextButtonUnderlineBaseProps &
  Omit<ComponentProps<'button'>, 'children' | 'type' | 'className'> & { renderLink?: undefined };
export type TextButtonUnderlineLinkProps = TextButtonUnderlineBaseProps & {
  /** 화면 이동 항목이면 링크로 그림(새 탭 열기·가운데 클릭). 비활성 없음 */
  renderLink: (_state: TextButtonUnderlineLinkState) => ReactElement;
};
export type TextButtonUnderlineProps =
  | TextButtonUnderlineButtonProps
  | TextButtonUnderlineLinkProps;

/**
 * 밑줄 글자 버튼(Figma `Text_Button_Underline`): 목록 줄 안의 보조 동작(예: 「전문보기」)
 * 기본은 일반 버튼, `renderLink`를 주면 링크. 누르는 동안 overlay-hover(10%)를 75ms ease-out으로 덮음
 */
export const TextButtonUnderline = (props: TextButtonUnderlineProps) => {
  const { children, className } = props;
  const state: TextButtonUnderlineLinkState = {
    className: cn(
      'rounded-r2 p-padding-p1 relative isolate inline-flex cursor-pointer touch-manipulation items-center justify-center',
      'typography-caption-1-regular text-text-tertiary underline decoration-from-font [text-underline-position:from-font]',
      'before:rounded-r2 before:bg-overlay-hover before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-75 before:ease-[cubic-bezier(0,0,0.58,1)] motion-reduce:before:transition-none',
      // 비활성은 눌림 없이 글자 text-disabled와 전체 40%(Figma Disabled)
      'not-disabled:active:before:opacity-100 disabled:text-text-disabled disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    ),
    children,
  };

  if (props.renderLink) return props.renderLink(state);
  const {
    children: _children,
    className: _className,
    renderLink: _renderLink,
    ...buttonProps
  } = props;
  return (
    <button type="button" {...buttonProps} className={state.className}>
      {children}
    </button>
  );
};
