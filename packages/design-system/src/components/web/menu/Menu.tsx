'use client';

import {
  type AnimationEvent,
  type ComponentProps,
  type KeyboardEvent,
  useEffect,
  useRef,
} from 'react';
import { cn } from '../../../utils';
import motion from './menuMotion.module.css';

export type MenuProps = Omit<ComponentProps<'div'>, 'role'> & {
  /** 접근성 이름(예: "번들 메뉴"). 보이는 제목이 없으므로 필수 */
  'aria-label': string;
  /** 열림 여부. 기본 `true`이고, `false`로 바꾸면 닫히는 모션을 재생한다(Figma 팝오버 메뉴 모션) */
  open?: boolean;
  /** 닫히는 모션이 끝났을 때. 호출하는 쪽이 이때 메뉴를 화면에서 뺀다 */
  onExited?: () => void;
};

const itemSelector = '[role="menuitem"]';

// 닫히는 모션(400ms)이 끝나지 않아도(애니메이션 취소, 조상 display:none, 탭 숨김 등) 메뉴가 남지 않도록 여유를 둔 뒤 onExited를 한 번 더 부름
const EXIT_FALLBACK_MS = 500;

/**
 * 메뉴 컨테이너(Figma `Menu`): `MenuItem`과 `MenuDivider`를 담는 `role="menu"` 카드
 * 방향키·Home·End로 항목 포커스를 옮김. 메뉴와 항목은 tabIndex=-1이라 Tab으로 들어올 수 없으므로 열 때 호출하는 쪽이 메뉴(ref.focus()) 또는 첫 항목에 포커스를 주어야 함
 * 열고 닫는 위치·상태, Esc·바깥 클릭·Tab 이탈 닫기, 트리거의 aria-haspopup="menu"·aria-expanded도 호출하는 쪽이 맡음
 * 모션: 화면에 나타날 때 38px 위로 올라오며 나타나고(400ms), `open={false}`로 바꾸면 38px 내려가며 사라진 뒤 `onExited` 호출
 */
export const Menu = ({
  className,
  children,
  open = true,
  onExited,
  onKeyDown,
  onAnimationEnd,
  ...props
}: MenuProps) => {
  const exitedRef = useRef(false);
  const onExitedRef = useRef(onExited);

  useEffect(() => {
    onExitedRef.current = onExited;
  });

  // 닫힘마다 onExited는 한 번만 부름(모션 끝과 안전장치 중 먼저 온 쪽)
  const notifyExited = () => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    onExitedRef.current?.();
  };

  useEffect(() => {
    if (open) {
      exitedRef.current = false;
      return undefined;
    }
    const timer = window.setTimeout(notifyExited, EXIT_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    onAnimationEnd?.(event);
    if (!open && event.target === event.currentTarget) notifyExited();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(itemSelector));
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (current + 1) % items.length;
        break;
      case 'ArrowUp':
        next = current <= 0 ? items.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div
      role="menu"
      tabIndex={-1}
      data-state={open ? 'open' : 'closed'}
      // 닫히는 동안에는 포커스·읽기 대상에서 뺌
      inert={open ? undefined : true}
      className={cn(
        motion.menu,
        'gap-s2 rounded-r8 bg-surface-primary p-s4 focus-visible:outline-border-brand flex w-43 flex-col shadow-[0_6px_8.5px_rgba(0,0,0,0.2)] focus-visible:outline-2 focus-visible:-outline-offset-2',
        className,
      )}
      onKeyDown={handleKeyDown}
      onAnimationEnd={handleAnimationEnd}
      {...props}
    >
      {children}
    </div>
  );
};
