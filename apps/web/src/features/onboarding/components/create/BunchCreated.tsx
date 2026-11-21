'use client';

import { Button } from '@app/design-system';
import { BunchAvatar, InviteMemberCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ProfilePhotoField } from '@/shared/components/profile/ProfilePhotoField';
import { defaultBunchImage } from '@/shared/lib/bunchProfile';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';
import { usePrefetchNextSteps } from '../../hooks/usePrefetchNextSteps';
import { useChangeBunchPhotoMutation } from '../../queries/bunches';
import { BunchConfetti } from '../BunchConfetti';

/** 번치 생성 완료: 만든 번치의 대표 사진 변경과 멤버 초대·번치 이동 */
export function BunchCreated() {
  const router = useRouter();
  usePrefetchNextSteps(ONBOARDING_PATHS.createBunchInvite, ONBOARDING_PATHS.bunchHome);
  const ready = useCreateBunchGuard(3);
  const { createdBunch, updateCreatedBunch } = useCreateBunchDraft();
  const changePhoto = useChangeBunchPhotoMutation(createdBunch?.id, updateCreatedBunch);
  if (!ready || !createdBunch) return null;

  const defaultImage = defaultBunchImage(createdBunch.characterType);

  // 조정을 마친 사진은 올리고, 기본 이미지 적용(undefined)은 되돌림. 실패하면 기존 이미지 유지(안내는 공통 토스트)
  const changeImage = (photo: string | undefined) => {
    if (changePhoto.isPending) return;
    changePhoto.mutate(photo);
  };

  return (
    <PageShell
      bottom={
        <div className="px-padding-p8">
          <InviteMemberCard
            title="멤버 초대하기"
            description="친구를 초대해 함께 시작해 보세요"
            onClick={() => router.push(ONBOARDING_PATHS.createBunchInvite)}
          />
          <div className="pt-s5">
            <Button className="w-full" onClick={() => router.replace(ONBOARDING_PATHS.bunchHome)}>
              내 번치로 이동하기
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative flex min-h-full flex-col">
        <p role="status" className="sr-only">
          {changePhoto.isPending ? '번치 사진을 저장하는 중이에요' : ''}
        </p>
        {/* 올리는 동안에도 덮지 않아 「내 번치로 이동하기」·「멤버 초대하기」를 누를 수 있음(기능명세 2.3.2 예외) */}
        <div className="gap-s12 flex flex-1 flex-col items-center justify-center">
          <div aria-busy={changePhoto.isPending} className="flex flex-col items-center">
            <ProfilePhotoField
              value={createdBunch.imageUrl}
              onChange={changeImage}
              // 고르자마자 저장하고 저장 중·실패를 따로 알림
              announceChange={false}
              renderPhoto={({ onCameraClick }) => (
                <BunchAvatar
                  src={createdBunch.imageUrl ?? defaultImage}
                  alt={createdBunch.imageUrl ? '번치 대표 사진' : ''}
                  onCameraClick={onCameraClick}
                  cameraLabel="사진 변경"
                />
              )}
            />
          </div>
          <h1 className="typography-title-1-semi-bold text-text-primary text-center">
            <span className="block">{createdBunch.name}</span>{' '}
            {/* 토큰이 없는 Figma 둘째 줄 색상 #111318 적용 */}
            <span className="block text-[#111318]">번치가 만들어졌어요!</span>
          </h1>
        </div>
        <BunchConfetti />
      </div>
    </PageShell>
  );
}
