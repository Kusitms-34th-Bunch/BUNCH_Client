import { Skeleton } from '@app/design-system';
import { TextFieldSkeleton } from '@/shared/components/skeleton/TextFieldSkeleton';

/**
 * 개인 프로필 편집 본문의 받는 중 자리(ProfileEditScreen과 같은 여백, Figma에 없는 상태)
 * 프로필 사진(90px)과 닉네임 값만 회색, 「닉네임」 제목·입력란 테두리는 실제 모양. 출생연도·성별은 동의 여부를 몰라 그리지 않음
 */
export function ProfileEditSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="pt-s18 flex flex-col items-center">
        <Skeleton shape="round" className="size-22.5" />
      </div>
      <div className="pt-s14 px-padding-p8">
        <TextFieldSkeleton label="닉네임" required counter />
      </div>
    </div>
  );
}
