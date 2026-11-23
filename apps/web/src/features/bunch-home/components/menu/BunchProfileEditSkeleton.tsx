import { Skeleton } from '@app/design-system';
import { TextFieldSkeleton } from '@/shared/components/skeleton/TextFieldSkeleton';

/**
 * 번치 프로필 편집 본문의 받는 중 자리(BunchProfileEditScreen과 같은 여백, Figma에 없는 상태)
 * 번치 사진(90px)과 이름·한 줄 소개 입력란(제목·글자 수 포함) 모두 회색
 */
export function BunchProfileEditSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="pt-s14 px-padding-p8 gap-s14 pb-s8 flex flex-col items-center"
    >
      <Skeleton shape="round" className="size-22.5" />
      <div className="gap-s8 flex w-full flex-col">
        <TextFieldSkeleton labelClassName="w-14" counter />
        <TextFieldSkeleton labelClassName="w-16" counter />
      </div>
    </div>
  );
}
