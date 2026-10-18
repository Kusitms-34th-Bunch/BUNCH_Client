'use client';

import { Button, GraphicPeopleIcon } from '@app/design-system';
import { BunchAvatar } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';
import { CreateBunchConfetti } from './CreateBunchConfetti';

// 기본 대표 이미지(구름 마스코트). 디자인 시스템에 이미지 파일이 없어 앱이 가진다
const DEFAULT_BUNCH_IMAGE = '/images/default-bunch.png';

/**
 * 번치 만들기를 마친 뒤 보는 완료 화면
 * 번치 이름과 폭죽 한 번, 멤버 초대·내 번치 이동 진입점. 멤버 초대는 초대 화면으로, 내 번치 이동은 피드(임시 `/`)로 이동한다
 */
export function BunchCreated() {
  const router = useRouter();
  const ready = useCreateBunchGuard(3);
  const draft = useCreateBunchDraft();
  const { finish } = draft;
  // 처음에는 입력한 이름을, 초대 화면에서 돌아왔을 때는 기록해 둔 이름을 쓴다
  const [createdName] = useState(draft.createdName ?? draft.name);

  // 입력값은 비우고 마쳤다는 기록만 남긴다. 뒤로 가기로 앞 단계에 돌아가면 가드가 첫 단계로 보내 다시 만들 수 없다
  useEffect(() => {
    if (ready && draft.createdName === null) finish(createdName);
  }, [ready, draft.createdName, finish, createdName]);

  if (!ready) return null;

  return (
    <PageShell
      bottom={
        <div className="px-padding-p8">
          {/* Figma가 링크처럼 그린 카드(`InviteMemberCard`는 라디오 선택 카드라 의미가 달라 쓰지 않음) */}
          <button
            type="button"
            onClick={() => router.push(ONBOARDING_PATHS.createBunchInvite)}
            className="bg-surface-secondary gap-s8 p-s10 rounded-r7 focus-visible:outline-border-brand flex w-full cursor-pointer items-center text-left focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span aria-hidden="true" className="flex shrink-0">
              <GraphicPeopleIcon />
            </span>
            <span className="gap-s2 flex min-w-0 flex-1 flex-col">
              <span className="typography-body-1-medium text-text-primary">멤버 초대하기</span>
              <span className="typography-body-3-regular text-text-tertiary">
                친구를 초대해 함께 시작해 보세요
              </span>
            </span>
          </button>
          <div className="pt-s5">
            <Button className="w-full" onClick={() => router.replace(ONBOARDING_PATHS.feed)}>
              내 번치로 이동하기
            </Button>
          </div>
        </div>
      }
    >
      <div className="relative flex min-h-full flex-col">
        <div className="gap-s12 flex flex-1 flex-col items-center justify-center">
          {/* 카메라(사진 변경)는 이미지 선택·업로드가 정해지기 전이라 눌러도 동작이 없다 */}
          <BunchAvatar src={DEFAULT_BUNCH_IMAGE} onCameraClick={() => undefined} />
          <h1 className="typography-title-1-semi-bold text-text-primary text-center">
            {createdName ? (
              <>
                <span className="block">{createdName}</span>{' '}
              </>
            ) : null}
            {/* Figma 둘째 줄 색은 #111318로 첫 줄(#121212)과 달라서 토큰이 없어 값을 그대로 씀 */}
            <span className="block text-[#111318]">번치가 만들어졌어요!</span>
          </h1>
        </div>
        <CreateBunchConfetti />
      </div>
    </PageShell>
  );
}
