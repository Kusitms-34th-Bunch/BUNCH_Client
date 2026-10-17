import type { ComponentProps } from 'react';

/** 아이콘 크기. sm 16px, md 20px, lg 24px. 크기마다 Figma가 그린 도형(선 굵기 포함)을 쓴다. */
export type IconSize = 'sm' | 'md' | 'lg';

export type IconProps = Omit<ComponentProps<'svg'>, 'children'> & {
  /** 기본값 `md` */
  size?: IconSize | undefined;
};
