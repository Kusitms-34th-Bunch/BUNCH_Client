import type { ComponentProps } from 'react';
import { cn } from '../../../utils';

export type ToggleProps = Omit<ComponentProps<'input'>, 'type' | 'role' | 'children'>;

/**
 * 52×28 켬·끔 토글(Figma `Toggle`): native 체크박스에 `role="switch"`를 주고 트랙과 노브는 따로 그림
 * 켜짐은 노브가 오른쪽, 꺼짐은 왼쪽. 접근성 이름은 호출하는 쪽 담당, `className`·`style`은 바깥 래퍼에 적용
 */
export const Toggle = ({ className, style, ...props }: ToggleProps) => (
  <span
    style={style}
    className={cn(
      'has-focus-visible:outline-border-brand h-s13 w-s19 relative inline-flex shrink-0 touch-manipulation rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
      className,
    )}
  >
    <input
      type="checkbox"
      role="switch"
      className="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
      {...props}
    />
    <span
      aria-hidden="true"
      className={cn(
        'bg-surface-inversed-lighter pointer-events-none size-full rounded-full',
        // 비활성: 연한 트랙, 켜진 채 비활성이면 hover 겹침으로 한 단계 어둡게(Figma `Disabled - True`)
        'peer-disabled:bg-surface-disabled peer-[:disabled:checked]:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
        'forced-colors:border forced-colors:border-[CanvasText]',
      )}
    />
    <span
      aria-hidden="true"
      className={cn(
        'bg-surface-primary top-s2 left-s2 size-s10 pointer-events-none absolute rounded-full',
        'peer-checked:translate-x-s12 transition-transform duration-150 ease-out motion-reduce:transition-none',
        'forced-colors:bg-[CanvasText] forced-colors:forced-color-adjust-none',
      )}
    />
  </span>
);
