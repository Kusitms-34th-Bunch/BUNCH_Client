'use client';

import { GraphicEditIcon, Header, LineCloseLargeIcon } from '@app/design-system';
import { CreateBunchCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';

/**
 * 회원가입 뒤 번치를 새로 만들지, 초대받은 번치에 참여할지 고르는 시작 화면
 * 닫기(X)는 번치 홈에서 들어온 경우만 이전 화면으로, 첫 진입은 도착지·확인 모달 미정으로 미연결
 */
export function BunchStartSelect({
  closeBackHref,
}: {
  /** 있으면 닫기(X)가 이전 화면으로. 이전 기록이 없으면(직접 진입) 이 경로로 대체 이동 */
  closeBackHref?: string | undefined;
}) {
  const router = useRouter();

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton
              label="닫기"
              onClick={
                closeBackHref
                  ? () => {
                      if (window.history.length > 1) router.back();
                      else router.replace(closeBackHref);
                    }
                  : undefined
              }
            >
              <LineCloseLargeIcon />
            </HeaderIconButton>
          }
        />
      }
    >
      <h1 className="typography-title-1-bold text-text-primary pt-s6 px-padding-p8 break-keep">
        본격적으로
        <br />
        번치를 시작해볼까요?
      </h1>
      <div className="pt-s25 px-padding-p8 gap-s4 flex flex-col">
        <CreateBunchCard
          title="새 번치 만들기"
          description="친구들을 초대하고 함께한 순간을 기록해봐요"
          icon={<GraphicEditIcon />}
          onClick={() => router.push(ONBOARDING_PATHS.createBunch)}
        />
        <CreateBunchCard
          title="초대받은 번치 참여하기"
          description="번치에 참여해 함께한 순간을 기록해봐요"
          icon={<GraphicEditIcon />}
          onClick={() => router.push(ONBOARDING_PATHS.joinBunch)}
        />
      </div>
    </PageShell>
  );
}
