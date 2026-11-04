'use client';

import { Button, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { CameraButton, ProfileImage } from '@app/design-system/web';
import { useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ProfileFields } from '@/shared/components/profile/ProfileFields';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { usePhotoPicker } from '@/shared/hooks/usePhotoPicker';
import { type ProfileValues, useProfileFields } from '@/shared/hooks/useProfileFields';
import { useScrollFocusedIntoView } from '@/shared/hooks/useScrollFocusedIntoView';
import { DEFAULT_BUNCH_IMAGE } from '@/shared/lib/bunchProfile';
import { WEB_IMAGE_ACCEPT } from '@/shared/lib/imageFile';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import { normalizeNickname } from '@/shared/lib/nickname';
import type { MyProfile } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';

const toProfileValues = (profile: MyProfile): ProfileValues => ({
  nickname: profile.nickname,
  birthYear: profile.birthYear === undefined ? '' : String(profile.birthYear),
  gender: profile.gender ?? null,
});

const isSameValues = (a: ProfileValues, b: ProfileValues) =>
  normalizeNickname(a.nickname) === normalizeNickname(b.nickname) &&
  a.birthYear === b.birthYear &&
  a.gender === b.gender;

/**
 * 개인 프로필 수정(화면 설계서 MY(1) 4~8번): 지금 값을 채운 닉네임·출생연도·성별과 프로필 사진
 * 바뀐 값이 있고 모두 유효할 때만 수정하기 활성, 누르면 MY로 돌아가 토스트(저장 API 연결 전이라 이동만)
 */
export function ProfileEditScreen({ profile }: { profile: MyProfile }) {
  const backOr = useBackOr();
  useScrollFocusedIntoView();
  const initial = toProfileValues(profile);
  const fields = useProfileFields(initial);
  const { inputRef, photoUrl, handleCameraClick, handleFileChange } = usePhotoPicker({
    onError: () => toast(MY_MESSAGES.photoUnusable),
  });
  // 저장 중 중복 탭 방지(화면 설계서 7번)
  const [submitting, setSubmitting] = useState(false);

  const changed = photoUrl !== undefined || !isSameValues(fields.values, initial);
  const canSubmit = changed && fields.isValid && !submitting;

  const submit = () => {
    setSubmitting(true);
    closeKeyboard();
    // MY에서 들어왔으면 그 기록으로 돌아감(replace하면 MY 기록이 두 번 쌓여 뒤로 가기가 한 번 헛돎)
    backOr(MY_PATHS.home);
    toast(MY_MESSAGES.profileEdited);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" onPointerDown={dismissKeyboard}>
      <PageShell
        header={
          <Header
            leading={
              // Figma 헤더 뒤로 가기 아이콘 색(#bcbec2), 가입 단계와 같은 연한 회색
              <HeaderIconButton
                label="뒤로 가기"
                tone="subtle"
                onClick={() => backOr(MY_PATHS.home)}
              >
                <LineChevronLeftLargeIcon />
              </HeaderIconButton>
            }
          />
        }
        bottom={
          <div className="px-padding-p8 pt-padding-p7">
            <Button className="w-full" disabled={!canSubmit} onClick={submit}>
              {MY_MESSAGES.profileEditSubmit}
            </Button>
          </div>
        }
      >
        <h1 className="sr-only">{MY_MESSAGES.profileEditTitle}</h1>
        {/* 헤더 아래 48, 사진과 입력 칸 사이 32(Figma 개인 프로필 편집(1)) */}
        <div className="pt-s18 flex flex-col items-center">
          <div className="relative h-22.5 w-23.75">
            <ProfileImage
              src={photoUrl ?? profile.imageSrc ?? DEFAULT_BUNCH_IMAGE}
              className="absolute top-0 left-0.75"
            />
            <CameraButton
              aria-label={MY_MESSAGES.photoChange}
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
          <ProfileFields fields={fields} showOptional={false} />
        </div>
      </PageShell>
    </div>
  );
}
