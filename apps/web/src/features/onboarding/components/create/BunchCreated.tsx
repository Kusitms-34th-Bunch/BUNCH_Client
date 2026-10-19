'use client';

import { Button, GraphicPeopleIcon } from '@app/design-system';
import { BunchAvatar } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../../constants/paths';
import { useCreateBunchDraft } from '../../contexts/createBunchDraftContext';
import { useBunchPhoto } from '../../hooks/useBunchPhoto';
import { useCreateBunchGuard } from '../../hooks/useCreateBunchGuard';
import { BunchConfetti } from '../BunchConfetti';

// 디자인 시스템에 자산이 없는 기본 대표 이미지
const DEFAULT_BUNCH_IMAGE = '/images/default-bunch.png';

export function BunchCreated() {
  const router = useRouter();
  const { inputRef, photoUrl, isPending, message, handleCameraClick, handleFileChange } =
    useBunchPhoto();
  const ready = useCreateBunchGuard(3);
  const draft = useCreateBunchDraft();
  const { finish } = draft;
  // 초대 화면에서 돌아올 때 완료 기록의 이름 사용
  const [createdName] = useState(draft.createdName ?? draft.name);

  // 완료 기록을 남기고 입력값을 초기화해 뒤로 가기 시 중복 생성 방지
  useEffect(() => {
    if (ready && draft.createdName === null) finish(createdName);
  }, [ready, draft.createdName, finish, createdName]);

  if (!ready) return null;

  return (
    <PageShell
      bottom={
        <div className="px-padding-p8">
          {/* Figma의 링크 형태 카드에 맞춘 초대 화면 이동 */}
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
          <div aria-busy={isPending} className="gap-s4 flex flex-col items-center">
            <BunchAvatar
              src={photoUrl ?? DEFAULT_BUNCH_IMAGE}
              alt={photoUrl ? '선택한 번치 대표 사진' : ''}
              onCameraClick={handleCameraClick}
              cameraLabel={isPending ? '사진 선택 중' : '사진 변경'}
            />
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="번치 대표 사진 파일 선택"
              className="hidden"
              onChange={handleFileChange}
            />
            <p
              role="status"
              className={
                photoUrl ? 'typography-body-3-regular text-text-tertiary text-center' : 'sr-only'
              }
            >
              {photoUrl ? '현재 화면에서만 미리 볼 수 있어요.' : ''}
            </p>
            <p
              role="status"
              className={
                message ? 'typography-body-3-regular text-text-tertiary text-center' : 'sr-only'
              }
            >
              {message}
            </p>
          </div>
          <h1 className="typography-title-1-semi-bold text-text-primary text-center">
            {createdName ? (
              <>
                <span className="block">{createdName}</span>{' '}
              </>
            ) : null}
            {/* 토큰이 없는 Figma 둘째 줄 색상 #111318 적용 */}
            <span className="block text-[#111318]">번치가 만들어졌어요!</span>
          </h1>
        </div>
        <BunchConfetti />
      </div>
    </PageShell>
  );
}
