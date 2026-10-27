import type { ComponentProps } from 'react';
import { LineAddLargeIcon, LineDotsLargeIcon } from '../../../icons';
import { cn } from '../../../utils';

const icons = { more: LineDotsLargeIcon, add: LineAddLargeIcon } as const;

export type FloatingButtonIcon = keyof typeof icons;

export type FloatingButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  /** 아이콘만 있는 버튼이라 접근성 이름 필수(예: "더보기", "사진 추가") */
  'aria-label': string;
  /** 점 세 개(`more`, 기본값) 또는 더하기(`add`) */
  icon?: FloatingButtonIcon | undefined;
};

/**
 * 화면 위에 띄우는 52px 원형 아이콘 버튼(Figma `FloatingButton`): 흰 배경·그림자·점 세 개 또는 더하기 아이콘
 * 위치(`fixed` 등)와 눌렀을 때의 동작은 호출하는 쪽 담당, 처리 중에는 `disabled` 전달
 */
export const FloatingButton = ({
  type = 'button',
  icon = 'more',
  className,
  ...props
}: FloatingButtonProps) => {
  const Icon = icons[icon];
  return (
    <button
      type={type}
      className={cn(
        // 그림자는 Figma 값(0 4 6 12%)과 같은 토큰이 없어 임의 값 적용
        'bg-surface-primary text-icon-primary relative isolate inline-flex size-13 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.12)]',
        'before:bg-overlay-pressed before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:opacity-0 before:transition-opacity before:duration-75 before:ease-out motion-reduce:before:transition-none',
        'not-disabled:active:before:opacity-100',
        'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:text-icon-disabled disabled:cursor-not-allowed disabled:opacity-(--semantic-opacity-disabled)',
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" />
    </button>
  );
};
