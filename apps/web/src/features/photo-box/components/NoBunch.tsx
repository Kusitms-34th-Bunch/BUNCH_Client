'use client';

import { Button } from '@app/design-system';
import { useRouter } from 'next/navigation';
import { PHOTO_BOX_PATHS } from '../constants/paths';

/** 소속 번치가 없을 때의 안내와 번치 만들기·초대 링크 참여 버튼(헤더·필터·올리기 버튼 없음) */
export function NoBunch() {
  const router = useRouter();

  return (
    <div className="gap-s17 px-s8 flex min-h-full flex-col items-center justify-center">
      <div className="gap-s9 flex flex-col items-center">
        {/* 번치 일러스트는 Figma가 추후 공유한다고 해서 회색 자리표시 사용 */}
        <div aria-hidden="true" className="bg-surface-tertiary h-36 w-43" />
        <div className="gap-s3 flex flex-col items-center text-center">
          <p className="typography-body-1-semi-bold text-text-secondary">참여 중인 번치가 없어요</p>
          <p className="typography-caption-1-regular text-text-tertiary">
            새 번치를 만들거나 초대받은 번치에 참여해보세요.
          </p>
        </div>
      </div>
      <div className="gap-s5 flex w-full flex-col">
        <Button className="w-full" onClick={() => router.push(PHOTO_BOX_PATHS.createBunch)}>
          새 번치 만들기
        </Button>
        <Button
          variant="tertiary"
          className="w-full"
          onClick={() => router.push(PHOTO_BOX_PATHS.joinBunch)}
        >
          초대 링크로 참여하기
        </Button>
      </div>
    </div>
  );
}
