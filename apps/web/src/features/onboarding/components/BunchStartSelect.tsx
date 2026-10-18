'use client';

import { GraphicEditIcon, Header, LineCloseLargeIcon } from '@app/design-system';
import { CreateBunchCard } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ONBOARDING_PATHS } from '../constants/paths';

/** 회원가입 뒤 번치를 새로 만들지, 초대받은 번치에 참여할지 고르는 시작 화면 */
// 닫기(X)는 도착지·확인 모달 미정으로 동작 미연결
export function BunchStartSelect() {
  const router = useRouter();

  return (
    <PageShell
      header={
        <Header
          leading={
            <button
              type="button"
              aria-label="닫기"
              className="text-icon-primary focus-visible:outline-border-brand -ml-s4 size-s16 flex cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <LineCloseLargeIcon />
            </button>
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
