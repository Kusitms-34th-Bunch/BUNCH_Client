import { Header, LineDotsLargeIcon, Skeleton } from '@app/design-system';
import { useEffect, useState } from 'react';
import { HeaderBackButton } from '@/shared/components/layout/HeaderBackButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PhotoGridSkeleton } from '@/shared/components/skeleton/PhotoGridSkeleton';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BunchProfileSkeleton } from '../home/BunchHomeSkeleton';

type OtherBunchSkeletonProps = {
  /** 뒤로 가기(받는 중에도 나갈 수 있게 실제로 동작) */
  onBack: () => void;
};

/**
 * 다른 번치 화면의 받는 중 자리(OtherBunchScreen과 같은 배치, Figma에 없는 상태)
 * 프로필 이미지 영역·흰 시트·이름·설명·수치·팔로우 버튼·번들 칸을 실제와 같은 높이로 그림
 * 뒤로 가기는 실제 버튼, 더보기는 받기 전이라 모양만(누를 수 없음). 배경은 번치 성격 색을 몰라 옅은 회색
 */
export function OtherBunchSkeleton({ onBack }: OtherBunchSkeletonProps) {
  // 상태 영역이 먼저 마운트된 뒤에 문구를 채워야 스크린 리더가 변화로 읽음(영역과 문구가 함께 생기면 읽히지 않을 수 있음)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <PageShell
      className="to-surface-primary from-surface-secondary bg-linear-to-b from-50% to-50%"
      header={
        <Header
          className="bg-surface-secondary"
          leading={<HeaderBackButton onClick={onBack} />}
          trailing={
            <span aria-hidden="true" className="text-icon-primary flex">
              <LineDotsLargeIcon />
            </span>
          }
        />
      }
    >
      {/* 제목(번치 이름 h1)은 받은 뒤에만: 차단 여부를 확인하는 동안 서버 렌더에도 번치 제목을 두지 않음, 진입 초점은 실제 제목이 생기면 감 */}
      <div role="status" className="flex min-h-full flex-col">
        <span className="sr-only">{mounted ? BUNCH_HOME_MESSAGES.otherBunchLoading : ''}</span>
        <div aria-hidden="true" className="bg-surface-secondary relative h-25.5 shrink-0">
          <Skeleton
            shape="round"
            tone="strong"
            className="border-border-tertiary right-s8 absolute top-6 z-10 size-22.5 border"
          />
        </div>
        <div className="bg-surface-primary rounded-t-r10 pt-padding-p16 gap-s8 pb-s8 relative -mt-5 flex flex-1 flex-col">
          <div className="gap-s8 flex flex-col">
            <BunchProfileSkeleton places={false} />
            {/* FollowButton(전체 폭, 높이 48) */}
            <div aria-hidden="true" className="px-padding-p8">
              <Skeleton className="rounded-r4 h-12 w-full" />
            </div>
          </div>
          <PhotoGridSkeleton
            count={9}
            tone="default"
            cellClassName="aspect-123/163"
            className="px-s1 pt-s1"
          />
        </div>
      </div>
    </PageShell>
  );
}
