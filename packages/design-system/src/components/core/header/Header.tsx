import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type HeaderProps = Omit<ComponentProps<'header'>, 'title' | 'children'> & {
  /** 제목 앞 영역(뒤로 가기 버튼, 로고, 계정 전환 등) */
  leading?: ReactNode;
  /** 제목 글자. 폭이 모자라면 한 줄로 말줄임 */
  title?: ReactNode;
  /** 오른쪽 끝 영역(아이콘 버튼, 텍스트 버튼). 제목이 없어도 오른쪽 끝 배치 */
  trailing?: ReactNode;
};

/**
 * 상단 바 레이아웃: 높이 48px, 좌우 16px, 왼쪽·제목·오른쪽 슬롯
 * 슬롯에 들어갈 버튼·아이콘은 호출하는 쪽이 조립(제품 요소를 알지 못함)
 */
export const Header = ({ leading, title, trailing, className, ...props }: HeaderProps) => {
  const hasTitle = title !== undefined && title !== null && title !== false;

  return (
    <header
      className={cn(
        'h-s18 gap-s4 bg-surface-primary px-padding-p8 flex w-full items-center',
        className,
      )}
      {...props}
    >
      {leading}
      {hasTitle ? (
        <div className="typography-heading-2-semibold text-text-primary min-w-0 flex-1 truncate">
          {title}
        </div>
      ) : null}
      {trailing ? (
        <div className="gap-s8 ml-auto flex shrink-0 items-center">{trailing}</div>
      ) : null}
    </header>
  );
};
