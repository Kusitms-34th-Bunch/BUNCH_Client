'use client';

import { Button } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CheckNickname } from '@/shared/hooks/useNicknameAvailability';
import { ProfileFields } from '@/shared/components/profile/ProfileFields';
import { ProfilePhotoField } from '@/shared/components/profile/ProfilePhotoField';
import { EMPTY_PROFILE_VALUES, useProfileFields } from '@/shared/hooks/useProfileFields';
import { useScrollFocusedIntoView } from '@/shared/hooks/useScrollFocusedIntoView';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import { SignupFrame } from './SignupFrame';

type ProfileSetupProps = {
  /** 시작하기를 누르면 이동할 경로. 이동 대상은 호출하는 route가 결정 */
  nextPath: string;
  /** 닉네임 중복 확인 호출. 없으면(서버 연결 전) 확인 생략 */
  checkNickname?: CheckNickname | undefined;
};

/**
 * 가입 마지막 단계인 프로필 작성 화면
 * 닉네임(필수)이 규칙에 맞고 중복이 아닐 때만 시작하기 활성화. 사진은 선택·조정·미리보기까지만 연결(저장·접근 제어는 미연결)
 */
export function ProfileSetup({ nextPath, checkNickname }: ProfileSetupProps) {
  const router = useRouter();
  useScrollFocusedIntoView();
  const fields = useProfileFields(EMPTY_PROFILE_VALUES, checkNickname);
  // 고른 사진은 미리보기만(저장·업로드는 가입 API 연결 시)
  const [photo, setPhoto] = useState<string>();

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
        <div className="pt-s18 flex flex-col items-center">
          <ProfilePhotoField value={photo} onChange={setPhoto} />
        </div>
        <div className="pt-s14 px-padding-p8">
          <ProfileFields fields={fields} />
        </div>
      </SignupFrame>
    </div>
  );
}
