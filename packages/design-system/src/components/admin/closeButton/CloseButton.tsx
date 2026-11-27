import type { ComponentProps } from 'react';
import { LineCloseSmallIcon } from '../../../icons';
import { cn } from '../../../utils';

// 비활성은 Figma에 모양이 없어 받지 않음
export type CloseButtonProps = Omit<
  ComponentProps<'button'>,
  'children' | 'aria-label' | 'disabled'
> & {
  /** 아이콘만 있는 버튼이라 접근성 이름 필수(예: "닫기") */
  'aria-label': string;
};

/**
 * 어드민 닫기 버튼(Figma `어드민 컴포넌트` > `Close Button`): 24px 원형, Default·Hover·Pressed
 * 데스크톱 전용이라 누름 영역은 보이는 크기 그대로. 닫는 동작은 `onClick`으로 호출자 담당
 */
export const CloseButton = ({ type = 'button', className, ...props }: CloseButtonProps) => (
  <button
    type={type}
    className={cn(
      'bg-surface-primary text-icon-secondary relative isolate inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full',
      // Hover·Pressed 덮개는 흰 바탕 위에 얹음(Figma: 바탕 위 overlay 채움)
      'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full',
      'hover:before:bg-overlay-hover active:before:bg-overlay-pressed',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
    {...props}
  >
    <LineCloseSmallIcon />
  </button>
);
