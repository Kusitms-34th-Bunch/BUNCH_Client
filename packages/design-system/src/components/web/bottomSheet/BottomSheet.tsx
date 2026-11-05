'use client';
/* eslint-disable react-refresh/only-export-components -- Compound API 부품을 객체 하나로 묶어 export */

import type { ComponentProps, ReactNode } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import { LineCloseIcon } from '../../../icons';
import { cn } from '../../../utils';

export type BottomSheetRootProps = {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  onOpenChangeComplete?: ((_open: boolean) => void) | undefined;
  /** 바깥 터치 닫기 차단(입력 중인 시트 등). ESC·끌기·닫기 버튼은 유지 */
  disablePointerDismissal?: boolean | undefined;
  children: ReactNode;
};
export type BottomSheetContentProps = ComponentProps<'div'> & {
  /** 손잡이 표시 여부. 끌어 닫기는 표시와 무관하게 유지 */
  handle?: boolean | undefined;
  backdropClassName?: string | undefined;
};
export type BottomSheetHeaderProps = ComponentProps<'div'>;
export type BottomSheetTitleProps = ComponentProps<'h2'>;
export type BottomSheetDescriptionProps = ComponentProps<'p'>;
export type BottomSheetCloseProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** 접근성 이름. 기본값 `닫기` */
  'aria-label'?: string;
};
export type BottomSheetBodyProps = ComponentProps<'div'>;
export type BottomSheetFooterProps = ComponentProps<'div'>;

// Figma 공통 모션(docs/architecture/motion.md): 열기 340ms·닫기 160ms, 아래→위 이동·투명도 40%→100%
const ease = 'ease-[cubic-bezier(0,0,0.35,1)]';
const safeAreaBottom = 'var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))';

const Root = ({
  open,
  onOpenChange,
  onOpenChangeComplete,
  disablePointerDismissal,
  children,
}: BottomSheetRootProps) => (
  <Drawer.Root
    open={open}
    onOpenChange={onOpenChange}
    onOpenChangeComplete={onOpenChangeComplete}
    disablePointerDismissal={disablePointerDismissal}
  >
    {/* 입력 칸이 있는 시트의 가상 키보드 가림 방지(Viewport 높이 보정) */}
    <Drawer.VirtualKeyboardProvider>{children}</Drawer.VirtualKeyboardProvider>
  </Drawer.Root>
);

const Content = ({
  handle = true,
  className,
  backdropClassName,
  style,
  children,
  ...props
}: BottomSheetContentProps) => (
  <Drawer.Portal>
    <Drawer.Backdrop
      className={cn(
        'bg-overlay-dim-subtle fixed inset-0 opacity-[calc(1-var(--drawer-swipe-progress,0))]',
        `transition-opacity duration-340 ${ease} data-ending-style:duration-160`,
        'data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0',
        backdropClassName,
      )}
    />
    <Drawer.Viewport className="fixed inset-0 flex items-end justify-center">
      <Drawer.Popup
        {...props}
        style={{ paddingBottom: `calc(${safeAreaBottom} + var(--spacing-s4))`, ...style }}
        className={cn(
          'bg-surface-primary rounded-t-r10 gap-s8 flex w-full max-w-(--app-max-width,100%) flex-col outline-none',
          'max-h-[calc(100dvh-var(--safe-area-top,env(safe-area-inset-top,0px))-var(--spacing-s12))]',
          // 위로 끌 때의 음수 값 무시(아래 방향만 추적)
          'translate-y-[max(0px,var(--drawer-swipe-movement-y,0px))]',
          `transition-[translate,opacity] duration-340 ${ease} data-ending-style:duration-160`,
          'data-starting-style:translate-y-full data-starting-style:opacity-40',
          'data-ending-style:translate-y-full data-ending-style:opacity-40',
          'data-swiping:duration-0 data-swiping:select-none',
          'motion-reduce:transition-opacity motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-starting-style:translate-y-0',
          className,
        )}
      >
        {handle ? (
          <div aria-hidden className="p-padding-p5 flex shrink-0 justify-center">
            {/* Figma 손잡이 #d9d9d9 토큰 부재로 가장 가까운 border-secondary 사용 */}
            <div className="bg-border-secondary h-1.75 w-13 rounded-full" />
          </div>
        ) : null}
        {children}
      </Drawer.Popup>
    </Drawer.Viewport>
  </Drawer.Portal>
);

// 제목·설명은 왼쪽 열, 닫기 버튼은 오른쪽 열에 자동 배치(감싸는 요소 불필요)
const Header = ({ className, ...props }: BottomSheetHeaderProps) => (
  <div
    {...props}
    className={cn(
      'px-padding-p8 gap-x-s4 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start',
      className,
    )}
  />
);
const Title = ({ className, ...props }: BottomSheetTitleProps) => (
  <Drawer.Title
    {...props}
    className={cn(
      'text-text-primary typography-heading-1-semibold col-start-1 wrap-break-word break-keep',
      className,
    )}
  />
);
const Description = ({ className, ...props }: BottomSheetDescriptionProps) => (
  <Drawer.Description
    {...props}
    className={cn(
      'mt-s2 text-text-quaternary typography-body-3-semi-bold col-start-1 wrap-break-word break-keep',
      className,
    )}
  />
);
// 아이콘 20px·누르는 영역 40px, 음수 margin으로 Figma 배치 유지
const Close = ({
  className,
  'aria-label': ariaLabel = '닫기',
  ...props
}: BottomSheetCloseProps) => (
  <Drawer.Close
    {...props}
    aria-label={ariaLabel}
    className={cn(
      'text-icon-primary -m-s5 p-s5 col-start-2 row-span-2 row-start-1 inline-flex cursor-pointer touch-manipulation rounded-full',
      'focus-visible:outline-border-brand focus-visible:outline-2',
      className,
    )}
  >
    <LineCloseIcon size="md" aria-hidden />
  </Drawer.Close>
);
const Body = ({ className, ...props }: BottomSheetBodyProps) => (
  <Drawer.Content
    {...props}
    className={cn(
      'px-padding-p8 min-h-0 flex-1 overflow-y-auto overscroll-contain select-text',
      className,
    )}
  />
);
const Footer = ({ className, ...props }: BottomSheetFooterProps) => (
  <div
    {...props}
    className={cn('gap-s4 px-padding-p8 pt-padding-p7 flex shrink-0 flex-col', className)}
  />
);

export const BottomSheet = { Root, Content, Header, Title, Description, Close, Body, Footer };
