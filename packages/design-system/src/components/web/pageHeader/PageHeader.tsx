import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type PageHeaderProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** 화면 제목. `h1`로 그려지므로 화면당 하나만 쓴다 */
  title: ReactNode;
  /** 제목 아래 설명 */
  description?: ReactNode;
  /** 제목 위 진행 표시(예: `Stepper`) */
  progress?: ReactNode;
};

/**
 * 화면 제목 영역: 진행 표시(선택) · 제목 · 설명(선택)을 세로로 쌓는다
 * 진행 표시와 문구는 호출하는 쪽이 넘긴다(제품 문구·단계 수를 알지 못함)
 */
export const PageHeader = ({
  title,
  description,
  progress,
  className,
  ...props
}: PageHeaderProps) => (
  <div
    className={cn(
      'gap-s13 bg-surface-primary px-padding-p8 pt-padding-p6 flex w-full flex-col items-start justify-center',
      className,
    )}
    {...props}
  >
    {progress}
    <div className="gap-s2 flex w-full flex-col">
      <h1 className="typography-title-1-semi-bold text-text-primary break-keep">{title}</h1>
      {description ? (
        <p className="typography-body-2-regular text-text-tertiary break-keep">{description}</p>
      ) : null}
    </div>
  </div>
);
