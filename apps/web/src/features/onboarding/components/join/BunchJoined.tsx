'use client';

import { Button, Header, LineCloseLargeIcon } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { defaultBunchImage } from '@/shared/lib/bunchProfile';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useJoinInvitationFlow } from '../../contexts/joinInvitationContext';
import { BunchConfetti } from '../BunchConfetti';

/**
 * 번치 참여 완료(기획 2.6.5): 서버가 돌려준 번치의 이름·대표 이미지를 보여 줌
 * 참여한 번치가 없으면(직접 진입·새로고침) 링크 입력으로 되돌림. 번치 메인 화면 미연결로 닫기·이동 시 피드 경로 사용
 */
export function BunchJoined() {
  const router = useRouter();
  const flow = useJoinInvitationFlow();
  const { joinedBunch } = flow;

  useEffect(() => {
    if (!joinedBunch) router.replace(ONBOARDING_PATHS.joinBunch);
  }, [joinedBunch, router]);

  if (!joinedBunch) return null;
  const leave = () => {
    router.replace(ONBOARDING_PATHS.feed);
  };
  const imageSrc = joinedBunch.imageUrl ?? defaultBunchImage(joinedBunch.characterType);
  const bunchName = joinedBunch.name;

  return (
    <PageShell
      header={
        <Header
          leading={
            <HeaderIconButton label="닫기" onClick={leave}>
              <LineCloseLargeIcon />
            </HeaderIconButton>
          }
        />
      }
      bottom={
        <div className="pt-padding-p5 px-padding-p8">
          <Button className="w-full" onClick={leave}>
            번치로 이동하기
          </Button>
        </div>
      }
    >
      <div className="relative flex min-h-full flex-col">
        <div className="gap-s10 pb-padding-p18 flex flex-1 flex-col items-center justify-center">
          {/* 대표 이미지 167px 원(`InviteCard`와 같은 값, 토큰 없음) */}
          <div className="bg-surface-secondary relative size-41.75 shrink-0 rounded-full">
            {/* 서버가 돌려준 외부 주소라 next/image 최적화를 쓰지 않음 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt=""
              className="absolute inset-0 size-full rounded-full object-cover object-bottom"
            />
          </div>
          <div className="gap-s3 px-padding-p8 flex flex-col items-center text-center">
            <h1 className="typography-title-1-semi-bold text-text-primary break-keep">
              {bunchName}에 합류했어요!
            </h1>
            <p className="typography-body-1-medium text-text-tertiary break-keep">
              이제 함께한 순간을 같이 기록할 수 있어요.
            </p>
          </div>
        </div>
        <BunchConfetti />
      </div>
    </PageShell>
  );
}
