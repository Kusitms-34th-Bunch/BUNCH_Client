import { Skeleton } from '@app/design-system';
import { TextFieldSkeleton } from '@/shared/components/skeleton/TextFieldSkeleton';

/**
 * 개인 프로필 편집 본문의 받는 중 자리(ProfileEditScreen과 같은 여백, Figma에 없는 상태)
 * 받아 둔 내 프로필이 없을 때만 보임(사진 90px, 「닉네임」 입력란). 출생연도·성별은 동의 여부를 몰라 그리지 않음
 */
export function ProfileEditSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="pt-s18 flex flex-col items-center">
        <Skeleton shape="round" className="size-22.5" />
      </div>
      <div className="pt-s14 px-padding-p8">
        <TextFieldSkeleton required counter />
      </div>
    </div>
  );
}
