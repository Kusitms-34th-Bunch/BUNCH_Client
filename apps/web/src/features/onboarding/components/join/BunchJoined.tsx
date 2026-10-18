'use client';

import { Button, Header, LineCloseLargeIcon } from '@app/design-system';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { BunchConfetti } from '../BunchConfetti';
import { HeaderIconButton } from '../HeaderIconButton';

type BunchJoinedProps = {
  bunchName: string;
  imageSrc: string;
};

/**
 * 번치에 참여한 뒤 보는 완료 화면: 대표 이미지와 「{번치 이름}에 합류했어요!」, 폭죽 한 번
 * 닫기(X)와 「번치로 이동하기」는 피드(임시 `/`, 설계서는 참여한 번치의 메인 화면)로 `replace`한다
 */
export function BunchJoined({ bunchName, imageSrc }: BunchJoinedProps) {
  const router = useRouter();
  const leave = () => router.replace(ONBOARDING_PATHS.feed);

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
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="167px"
              className="rounded-full object-cover object-bottom"
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
