import type { ComponentProps, ReactNode } from 'react';
import { LinePlugOffMediumIcon } from '../../../icons';
import { cn } from '../../../utils';

export type ErrorBannerProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** 안내 문구(글자) */
  children: ReactNode;
  /** 문구 앞 아이콘(기본은 연결 끊김 아이콘, `null`이면 숨김, 장식이라 스크린 리더에서는 항상 숨겨짐) */
  icon?: ReactNode | undefined;
  /** 오른쪽 밑줄 버튼의 글자(없거나 빈 문자열이면 버튼을 그리지 않음, 누를 동작은 `onActionClick`과 짝으로 줌) */
  actionLabel?: string | undefined;
  /** 오른쪽 버튼을 눌렀을 때 */
  onActionClick?: (() => void) | undefined;
};

/**
 * 화면 위쪽에 놓는 오류 안내 배너(Figma `Page Banner`): 빨간 배경에 아이콘·문구·밑줄 버튼
 * 나타나는 순간 읽히도록 `role="alert"`이며 `className`은 배너에 적용
 */
export const ErrorBanner = ({
  children,
  icon = <LinePlugOffMediumIcon aria-hidden="true" />,
  actionLabel,
  onActionClick,
  className,
  ...props
}: ErrorBannerProps) => (
  <div
    role="alert"
    className={cn(
      'bg-system-fail-text text-system-fail-bg px-s8 py-s6 gap-s4 flex w-full items-center',
      className,
    )}
    {...props}
  >
    {icon !== null && icon !== undefined && (
      <span aria-hidden="true" className="inline-flex shrink-0">
        {icon}
      </span>
    )}
    <p className="typography-body-3-regular min-w-0 flex-1">{children}</p>
    {actionLabel && (
      <button
        type="button"
        onClick={onActionClick}
        className={cn(
          'typography-body-3-regular px-s3 relative shrink-0 cursor-pointer touch-manipulation underline decoration-from-font [text-underline-position:from-font]',
          // 보이는 높이는 글자(21px)대로 두고 터치 영역만 배너 높이만큼 넓힘
          "before:absolute before:inset-x-0 before:-inset-y-3 before:content-['']",
          'focus-visible:outline-system-fail-bg focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
