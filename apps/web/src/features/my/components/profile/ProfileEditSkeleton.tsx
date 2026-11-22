import { Skeleton } from '@app/design-system';

/**
 * 개인 프로필 편집 본문의 받는 중 자리(ProfileEditScreen과 같은 여백, Figma에 없는 상태)
 * 받아 둔 내 프로필이 없을 때만 보여 본문 전체를 회색으로 둠(사진 90px, 「닉네임」 제목, 입력란 46px, 글자 수). 출생연도·성별은 동의 여부를 몰라 그리지 않음
 */
export function ProfileEditSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="pt-s18 flex flex-col items-center">
        <Skeleton shape="round" className="size-22.5" />
      </div>
      <div className="pt-s14 px-padding-p8 gap-s3 flex flex-col items-end">
        <div className="gap-s2 flex w-full flex-col items-start">
          <span className="typography-body-3-semibold flex h-lh items-center">
            <Skeleton className="h-4 w-12" />
          </span>
          <Skeleton className="rounded-r5 h-11.5 w-full" />
        </div>
        <Skeleton className="h-3.5 w-8" />
      </div>
    </div>
  );
}
