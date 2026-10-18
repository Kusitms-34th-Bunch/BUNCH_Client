import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type CreateBunchCardProps = Omit<
  ComponentProps<'button'>,
  'children' | 'title' | 'type' | 'disabled'
> & {
  title: string;
  description: string;
  /** 위쪽 원 안에 들어갈 그래픽 아이콘(40px). 장식이라 접근성에서 숨김 */
  icon: ReactNode;
};

/**
 * 번치 시작 방식 카드: 누르면 바로 다음 흐름으로 이동하는 버튼
 * 선택 상태 없이 눌려 있는 동안만 어둡게 표시. 이동은 호출하는 쪽이 `onClick`으로 처리(링크 의미 없음)
 */
export const CreateBunchCard = ({
  title,
  description,
  icon,
  className,
  ...props
}: CreateBunchCardProps) => (
  <button
    type="button"
    className={cn(
      'gap-s5 py-s11 rounded-r6 bg-surface-secondary group flex w-full cursor-pointer flex-col items-center text-center',
      // 눌림 표시는 배경 layer로 겹침(카드 위에 얹으면 아이콘까지 어두워짐)
      'active:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
      'focus-visible:outline-border-brand focus-visible:outline-2 focus-visible:outline-offset-2',
      className,
    )}
    {...props}
  >
    {/* Figma 원 지름 69px은 토큰에 없어 기본 scale 17.25 적용 */}
    <span
      aria-hidden="true"
      className="bg-surface-primary flex size-17.25 shrink-0 items-center justify-center rounded-full group-active:bg-[linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]"
    >
      {icon}
    </span>
    <span className="gap-s1 flex w-full flex-col items-center">
      <span className="typography-heading-2-semibold text-text-primary w-full">{title}</span>
      <span className="typography-body-3-regular text-text-tertiary w-full">{description}</span>
    </span>
  </button>
);
