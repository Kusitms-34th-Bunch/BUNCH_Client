'use client';

import {
  GraphicEntryCreateIcon,
  GraphicEntryJoinIcon,
  Header,
  LineCloseLargeIcon,
} from '@app/design-system';
import { EntryCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useExitFlowDialog } from '../../hooks/useExitFlowDialog';

/**
 * 회원가입 뒤 번치를 새로 만들지, 초대받은 번치에 참여할지 고르는 시작 화면
 * 닫기(X)는 번치 홈에서 들어온 경우 이전 화면으로, 첫 진입은 중단 확인 모달 뒤 피드로 이동
 */
export function BunchStartSelect({
  closeBackHref,
}: {
  /** 있으면 닫기(X)가 이전 화면으로. 이전 기록이 없으면(직접 진입) 이 경로로 대체 이동 */
  closeBackHref?: string | undefined;
}) {
  const router = useRouter();
  const backOr = useBackOr();
  // 입력값이 없는 시작 화면이라 흐름 상태 정리 없이 피드로 이동
  const openExitDialog = useExitFlowDialog({
    title: '번치 만들기를 그만둘까요?',
    description: '지금 나가면 피드로 이동해요.',
    cancelLabel: '계속 만들기',
    onExit: () => router.replace(ONBOARDING_PATHS.feed),
  });

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton
              label="닫기"
              onClick={closeBackHref ? () => backOr(closeBackHref) : openExitDialog}
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
      <div className="pt-s15 px-padding-p8 flex flex-col gap-3.25">
        <EntryCard
          title="새 번치 만들기"
          description="친구들을 초대하고 함께한 순간을 기록해봐요"
          imageSrc="/images/onboarding/entry-create.jpg"
          graphic={<GraphicEntryCreateIcon />}
          onClick={() => router.push(ONBOARDING_PATHS.createBunch)}
        />
        <EntryCard
          title="초대 받은 번치 참여하기"
          description="번치에 참여해 함께한 순간을 기록해봐요"
          imageSrc="/images/onboarding/entry-join.jpg"
          graphic={<GraphicEntryJoinIcon />}
          onClick={() => router.push(ONBOARDING_PATHS.joinBunch)}
        />
      </div>
    </PageShell>
  );
}
