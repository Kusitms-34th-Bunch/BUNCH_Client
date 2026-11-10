import { AccountSwitcher, Header, LineBellLargeIcon, LineDotsLargeIcon } from '@app/design-system';
import Link from 'next/link';
import { BUNCH_HOME_PATHS } from '../constants/paths';

type BunchHomeHeaderProps = {
  bunchName: string;
  /** 번치 이름·화살표를 눌렀을 때(전환 시트 열기) */
  onBunchClick: () => void;
  /** 전환 시트가 열려 있는지(트리거의 aria-expanded) */
  switcherOpen: boolean;
  /** 배경 class(프로필 이미지 영역과 같은 번치 성격 색) */
  className: string;
};

// 24px 아이콘, 터치 영역은 before로 40px까지 넓힘(아이콘 사이 16px 간격 유지)
export const headerIconLinkClass =
  'text-icon-primary focus-visible:outline-border-brand relative flex size-6 cursor-pointer touch-manipulation items-center justify-center rounded-full before:absolute before:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2';

/** 번치 홈 상단 헤더: 번치 전환(이름·화살표), 알림, 더보기. 배경은 프로필 이미지 영역과 같은 성격 색 */
export function BunchHomeHeader({
  bunchName,
  onBunchClick,
  switcherOpen,
  className,
}: BunchHomeHeaderProps) {
  return (
    <Header
      className={className}
      leading={
        <AccountSwitcher
          label={bunchName}
          aria-haspopup="dialog"
          aria-expanded={switcherOpen}
          onClick={onBunchClick}
        />
      }
      trailing={
        <>
          {/* 화면 이동이라 링크(새 탭 열기·가운데 클릭 지원). 안 읽은 알림 점은 Figma가 정해지면 추가 */}
          <Link
            href={BUNCH_HOME_PATHS.notifications}
            aria-label="알림"
            className={headerIconLinkClass}
          >
            <LineBellLargeIcon />
          </Link>
          <Link href={BUNCH_HOME_PATHS.menu} aria-label="더보기" className={headerIconLinkClass}>
            <LineDotsLargeIcon />
          </Link>
        </>
      }
    />
  );
}
