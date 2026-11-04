'use client';

import { Button, toast } from '@app/design-system';
import { CameraButton, PageHeader, ProfileImage } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import type { CheckNickname } from '@/shared/hooks/useNicknameAvailability';
import { ProfileFields } from '@/shared/components/profile/ProfileFields';
import { usePhotoPicker } from '@/shared/hooks/usePhotoPicker';
import { EMPTY_PROFILE_VALUES, useProfileFields } from '@/shared/hooks/useProfileFields';
import { useScrollFocusedIntoView } from '@/shared/hooks/useScrollFocusedIntoView';
import { DEFAULT_BUNCH_IMAGE } from '@/shared/lib/bunchProfile';
import { WEB_IMAGE_ACCEPT } from '@/shared/lib/imageFile';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import { SignupFrame } from './SignupFrame';

// 기획: 지원하지 않는 형식·손상된 사진은 이 문구의 토스트
const PHOTO_UNUSABLE_MESSAGE = '이 사진은 사용할 수 없어요.';

type ProfileSetupProps = {
  /** 시작하기를 누르면 이동할 경로. 이동 대상은 호출하는 route가 결정 */
  nextPath: string;
  /** 닉네임 중복 확인 호출. 없으면(서버 연결 전) 확인 생략 */
  checkNickname?: CheckNickname | undefined;
};

/**
 * 가입 마지막 단계인 프로필 작성 화면
 * 닉네임(필수)이 규칙에 맞고 중복이 아닐 때만 시작하기 활성화. 사진은 미리보기까지만 연결(저장·접근 제어는 미연결)
 */
export function ProfileSetup({ nextPath, checkNickname }: ProfileSetupProps) {
  const router = useRouter();
  useScrollFocusedIntoView();
  const fields = useProfileFields(EMPTY_PROFILE_VALUES, checkNickname);
  const { inputRef, photoUrl, handleCameraClick, handleFileChange } = usePhotoPicker({
    onError: () => toast(PHOTO_UNUSABLE_MESSAGE),
  });

  const start = () => {
    closeKeyboard();
    router.replace(nextPath);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" onPointerDown={dismissKeyboard}>
      <SignupFrame
        bottom={
          <div className="px-padding-p8 pt-padding-p7">
            <Button className="w-full" disabled={!fields.isValid} onClick={start}>
              BUNCH 시작하기
            </Button>
          </div>
        }
      >
        <PageHeader
          title="먼저 나를 소개해 볼까요?"
          description="BUNCH에서 사용할 닉네임과 프로필 사진을 설정해 주세요."
        />
        <div className="pt-s18 gap-s4 flex flex-col items-center">
          <div className="relative h-22.5 w-23.75">
            <ProfileImage
              src={photoUrl ?? DEFAULT_BUNCH_IMAGE}
              className="absolute top-0 left-0.75"
            />
            <CameraButton
              aria-label="프로필 사진 변경"
              className="absolute top-15.5 left-16.75"
              onClick={() => {
                closeKeyboard();
                handleCameraClick();
              }}
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={WEB_IMAGE_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="pt-s14 px-padding-p8">
          <ProfileFields fields={fields} />
        </div>
      </SignupFrame>
    </div>
  );
}
