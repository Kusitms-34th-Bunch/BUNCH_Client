'use client';

import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { useState } from 'react';
import type { CheckNickname } from '@/shared/hooks/useNicknameAvailability';
import { checkNicknameAvailability } from '@/shared/api/nickname';
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

// 출생연도·성별은 추가 개인정보에 동의한 사람만 값을 갖고 고칠 수 있음(기능명세서 7.2.6). 동의하지 않았으면 비워 둔 비활성 칸
const toProfileValues = (profile: MyProfile, consented: boolean): ProfileValues => ({
  nickname: profile.nickname,
  birthYear: consented && profile.birthYear !== undefined ? String(profile.birthYear) : '',
  gender: consented ? (profile.gender ?? null) : null,
});

const isSameValues = (a: ProfileValues, b: ProfileValues) =>
  normalizeNickname(a.nickname) === normalizeNickname(b.nickname) &&
  a.birthYear === b.birthYear &&
  a.gender === b.gender;

/**
 * 개인 프로필 수정(화면 설계서 MY(1) 4~8번): 지금 값을 채운 닉네임·프로필 사진·출생연도·성별
 * 추가 개인정보에 동의하지 않았으면 출생연도·성별은 비활성으로 보임(Figma 6745:46068)
 * 바뀐 값이 있고 모두 유효할 때만 수정하기 활성, 누르면 MY로 돌아가 토스트(저장 API 연결 전이라 이동만)
 */
export function ProfileEditScreen({
  profile,
  demographicsConsent,
  checkNickname = checkNicknameAvailability,
}: {
  profile: MyProfile;
  /** 추가 개인정보(출생연도·성별) 수집·이용 동의 여부. 동의해야 출생연도·성별을 고칠 수 있음 */
  demographicsConsent: boolean;
  /** 닉네임 중복 확인 호출(테스트에서 바꿔 끼움) */
  checkNickname?: CheckNickname | undefined;
}) {
  const backOr = useBackOr();
  useScrollFocusedIntoView();
  const initial = toProfileValues(profile, demographicsConsent);
  // 지금 내 닉네임과 같으면 중복 확인을 건너뜀(기능명세서 7.2.5 로직 1)
  const fields = useProfileFields(initial, checkNickname, { currentNickname: profile.nickname });
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
          <ProfileFields
            fields={fields}
            demographicsDisabled={!demographicsConsent}
            demographicsDisabledPlaceholder={MY_MESSAGES.demographicsLockedPlaceholder}
          />
        </div>
      </PageShell>
    </div>
  );
}
