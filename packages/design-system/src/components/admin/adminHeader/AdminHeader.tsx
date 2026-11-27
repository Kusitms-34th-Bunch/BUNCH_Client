import type { ComponentProps, ReactNode } from 'react';
import { LineChevronLeftLargeIcon, LineCloseLargeIcon } from '../../../icons';
import { cn } from '../../../utils';
import { IconButton } from '../../core/iconButton';

// 뒤로 가기·닫기 버튼은 누를 때 부를 콜백과 접근성 이름을 함께 받음(아이콘만 있는 버튼이라 이름 필수)
export type AdminHeaderAction = {
  onClick: () => void;
  /** 접근성 이름(예: "목록으로", "닫기") */
  label: string;
};

export type AdminHeaderProps = Omit<ComponentProps<'header'>, 'title' | 'children'> & {
  /** 제목(예: 장소 이름) */
  title: string;
  /** 제목 옆 식별 코드(예: `#S-0012`) */
  code?: string | undefined;
  /** 제목 뒤 상태 배지(예: `ColorBadge`로 그린 「노출중」) */
  badge?: ReactNode;
  /** 제목 앞 뒤로 가기 버튼. 없으면 숨김 */
  back?: AdminHeaderAction | undefined;
  /** 오른쪽 끝 닫기 버튼. 없으면 숨김 */
  close?: AdminHeaderAction | undefined;
  /** 제목의 heading 단계. 기본 h2(상세 패널 안의 제목) */
  titleAs?: 'h1' | 'h2' | 'h3' | undefined;
};

/**
 * 어드민 상세 패널 위쪽 제목줄(Figma `어드민 컴포넌트` > `Header`): 뒤로 가기·제목·코드·배지·닫기
 * core `Header`(모바일 상단 바 48px)와 규격이 달라 별도 컴포넌트(2026-11-27 비교)
 */
export const AdminHeader = ({
  title,
  code,
  badge,
  back,
  close,
  titleAs: Title = 'h2',
  className,
  ...props
}: AdminHeaderProps) => (
  <header
    className={cn(
      'px-padding-p16 py-padding-p10 flex w-full items-center justify-between gap-s5',
      className,
    )}
    {...props}
  >
    <div className="gap-s5 flex min-w-0 items-center">
      {back ? (
        <IconButton
          variant="plain"
          aria-label={back.label}
          onClick={back.onClick}
          className="text-icon-tertiary before:-inset-2"
        >
          <LineChevronLeftLargeIcon />
        </IconButton>
      ) : null}
      <div className="gap-s7 flex min-w-0 items-end">
        <div className="gap-s3 flex min-w-0 items-end">
          <Title className="typography-title-1-semi-bold text-text-primary truncate">{title}</Title>
          {code ? (
            <span className="typography-body-3-regular text-text-quaternary shrink-0">{code}</span>
          ) : null}
        </div>
        {badge ? <span className="flex shrink-0">{badge}</span> : null}
      </div>
    </div>
    {close ? (
      <IconButton
        variant="plain"
        aria-label={close.label}
        onClick={close.onClick}
        className="text-icon-primary shrink-0 before:-inset-2"
      >
        <LineCloseLargeIcon />
      </IconButton>
    ) : null}
  </header>
);
