import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../utils';

export type HeaderProps = Omit<ComponentProps<'header'>, 'title'> & {
  /** 제목 앞 영역(뒤로 가기 버튼, 로고, 계정 전환 등) */
  leading?: ReactNode;
  /** 제목 글자. 폭이 모자라면 한 줄로 잘린다 */
  title?: ReactNode;
  /** `title` 대신 쓰는 자유 중앙 영역(검색 필드 등). `title`이 있으면 무시한다 */
  children?: ReactNode;
  /** 오른쪽 끝 영역(아이콘 버튼, 텍스트 버튼). 중앙 영역이 없어도 오른쪽에 붙는다 */
  trailing?: ReactNode;
};

/**
 * 상단 바 레이아웃: 높이 48px, 좌우 16px, 좌·중앙·우 슬롯
 * 슬롯에 들어갈 버튼·아이콘·검색 필드는 호출하는 쪽이 조립(제품 요소를 알지 못함)
 */
export const Header = ({
  leading,
  title,
  trailing,
  className,
  children,
  ...props
}: HeaderProps) => {
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
      ) : children ? (
        <div className="min-w-0 flex-1">{children}</div>
      ) : null}
      {trailing ? (
        <div className="gap-s8 ml-auto flex shrink-0 items-center">{trailing}</div>
      ) : null}
    </header>
  );
};
