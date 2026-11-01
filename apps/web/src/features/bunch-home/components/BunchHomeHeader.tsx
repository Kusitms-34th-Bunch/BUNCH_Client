import type { ReactNode } from 'react';
import { AccountSwitcher, Header, LineBellLargeIcon, LineDotsLargeIcon } from '@app/design-system';
import Link from 'next/link';
import { BUNCH_HOME_PATHS } from '../constants/paths';

type BunchHomeHeaderProps = {
  bunchName: string;
  bunchImageSrc?: string | undefined;
  /** 번치 이름·화살표를 눌렀을 때(전환 시트 열기) */
  onBunchClick: () => void;
  /** 전환 시트가 열려 있는지(트리거의 aria-expanded) */
  switcherOpen: boolean;
  /** 알림 종(알림 화면은 추후 작업이라 호출 지점만 둠) */
  onNotificationClick?: (() => void) | undefined;
};

// 24px 아이콘, 터치 영역은 before로 40px까지 넓힘(아이콘 사이 16px 간격 유지)
const trailingIconClass =
  'text-icon-primary focus-visible:outline-border-brand relative flex size-6 cursor-pointer touch-manipulation items-center justify-center rounded-full before:absolute before:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2';

function TrailingIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: (() => void) | undefined;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={trailingIconClass}>
      {children}
    </button>
  );
}

/** 번치 홈 상단 헤더: 번치 전환(이미지·이름·화살표), 알림, 더보기. 배경은 캐릭터 영역과 같은 brand-subtle */
export function BunchHomeHeader({
  bunchName,
  bunchImageSrc,
  onBunchClick,
  switcherOpen,
  onNotificationClick,
}: BunchHomeHeaderProps) {
  return (
    <Header
      className="bg-surface-brand-subtle-1"
      leading={
        <AccountSwitcher
          label={bunchName}
          avatarSrc={bunchImageSrc}
          aria-haspopup="dialog"
          aria-expanded={switcherOpen}
          onClick={onBunchClick}
        />
      }
      trailing={
        <>
          <TrailingIconButton label="알림" onClick={onNotificationClick}>
            <LineBellLargeIcon />
          </TrailingIconButton>
          {/* 화면 이동이라 링크(새 탭 열기·가운데 클릭 지원) */}
          <Link href={BUNCH_HOME_PATHS.menu} aria-label="더보기" className={trailingIconClass}>
            <LineDotsLargeIcon />
          </Link>
        </>
      }
    />
  );
}
