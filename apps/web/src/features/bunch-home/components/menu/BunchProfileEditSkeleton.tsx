import { Skeleton } from '@app/design-system';
import { TextFieldSkeleton } from '@/shared/components/skeleton/TextFieldSkeleton';

/**
 * 번치 프로필 편집 본문의 받는 중 자리(BunchProfileEditScreen과 같은 여백, Figma에 없는 상태)
 * 번치 사진(90px)과 이름·한 줄 소개 값만 회색, 입력란 제목·테두리·글자 수 자리는 실제 배치
 */
export function BunchProfileEditSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="pt-s14 px-padding-p8 gap-s14 pb-s8 flex flex-col items-center"
    >
      <Skeleton shape="round" className="size-22.5" />
      <div className="gap-s8 flex w-full flex-col">
        <TextFieldSkeleton label="번치 이름" counter valueClassName="w-24" />
        <TextFieldSkeleton label="한 줄 소개" counter valueClassName="w-48" />
      </div>
    </div>
  );
}
