'use client';

import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ProfileFields } from '@/shared/components/profile/ProfileFields';
import { ProfilePhotoField } from '@/shared/components/profile/ProfilePhotoField';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { type ProfileValues, useProfileFields } from '@/shared/hooks/useProfileFields';
import { useScreenOverlay } from '@/shared/hooks/useScreenOverlay';
import { useScrollFocusedIntoView } from '@/shared/hooks/useScrollFocusedIntoView';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import { normalizeNickname } from '@/shared/lib/nickname';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import type { MyProfile } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';

// 출생연도·성별은 편집 화면에서 다루지 않음(Figma 개인 프로필 편집)
const toProfileValues = (profile: MyProfile): ProfileValues => ({
  nickname: profile.nickname,
  birthYear: '',
  gender: null,
});

const isSameValues = (a: ProfileValues, b: ProfileValues) =>
  normalizeNickname(a.nickname) === normalizeNickname(b.nickname);

/**
 * 개인 프로필 수정(화면 설계서 MY(1) 4~8번): 지금 값을 채운 닉네임과 프로필 사진(출생연도·성별은 없음, Figma 개인 프로필 편집)
 * 바뀐 값이 있고 모두 유효할 때만 수정하기 활성, 누르면 MY로 돌아가 토스트(저장 API 연결 전이라 이동만)
 */
export function ProfileEditScreen({ profile }: { profile: MyProfile }) {
  const backOr = useBackOr();
  useScrollFocusedIntoView();
  const initial = toProfileValues(profile);
  const fields = useProfileFields(initial);
  // 바꾼 사진은 미리보기만(서버 반영은 프로필 수정 API 연결 시)
  const [photo, setPhoto] = useState(profile.imageSrc);
  // 저장 중 중복 탭 방지(화면 설계서 7번)
  const [submitting, setSubmitting] = useState(false);
  const openOverlay = useScreenOverlay();

  const changed = photo !== profile.imageSrc || !isSameValues(fields.values, initial);
  const canSubmit = changed && fields.isValid && !submitting;
  // 바꾼 내용이 있으면 나가기 전에 확인(기능명세서 7.2.1 상세 7)
  // 저장 뒤 돌아가는 전환 중에는 묻지 않음
  const back = () => {
    if (!changed || submitting) return backOr(MY_PATHS.home);
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={MY_MESSAGES.profileLeave.title}
        description={MY_MESSAGES.profileLeave.description}
        confirmLabel={MY_MESSAGES.profileLeave.confirm}
        cancelLabel={MY_MESSAGES.cancel}
        onConfirm={() => {
          close();
          backOr(MY_PATHS.home);
        }}
      />
    ));
  };

  const submit = () => {
    setSubmitting(true);
    closeKeyboard();
    // MY에서 들어왔으면 그 기록으로 돌아감(replace하면 MY 기록이 두 번 쌓여 뒤로 가기가 한 번 헛돎)
    backOr(MY_PATHS.home);
    toastAfterNavigation(MY_MESSAGES.profileEdited);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" onPointerDown={dismissKeyboard}>
      <PageShell
        header={
          <Header
            leading={
              // Figma 헤더 뒤로 가기 아이콘 색(#bcbec2), 가입 단계와 같은 연한 회색
              <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={back}>
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
          <ProfilePhotoField value={photo} onChange={setPhoto} />
        </div>
        <div className="pt-s14 px-padding-p8">
          <ProfileFields fields={fields} showDemographics={false} />
        </div>
      </PageShell>
    </div>
  );
}
