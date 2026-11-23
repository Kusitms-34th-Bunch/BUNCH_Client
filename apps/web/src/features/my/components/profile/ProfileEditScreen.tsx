'use client';

import { isApiError } from '@app/api-core';
import { Button, ConfirmDialog, Header, LineChevronLeftLargeIcon, toast } from '@app/design-system';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CheckNickname } from '@/shared/hooks/profile/useNicknameAvailability';
import { checkNicknameAvailability } from '@/shared/api/nickname';
import { prohibitedFieldsOf } from '@/shared/api/prohibitedWord';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ProfileFields } from '@/shared/components/profile/ProfileFields';
import { ProfilePhotoField } from '@/shared/components/profile/ProfilePhotoField';
import { useScreenOverlay } from '@/shared/hooks/overlay/useScreenOverlay';
import { type ProfileValues, useProfileFields } from '@/shared/hooks/profile/useProfileFields';
import { useScrollFocusedIntoView } from '@/shared/hooks/scroll/useScrollFocusedIntoView';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import { toastAfterNavigation } from '@/shared/lib/navigation/toastAfterNavigation';
import { normalizeNickname } from '@/shared/lib/profile/nickname';
import type { ProfilePhotoChange } from '../../api/profile';
import type { MyProfile } from '../../lib/types';
import { MY_MESSAGES } from '../../constants/messages';
import { MY_PATHS } from '../../constants/paths';
import { useUpdateProfileMutation } from '../../queries/profile';

// 저장 직전 서버가 다시 확인한 닉네임 중복(가입과 같은 코드)
const NICKNAME_TAKEN_CODE = 'USER_002';

// 출생연도·성별은 추가 개인정보에 동의한 사람만 값을 갖고 고칠 수 있음(기능명세서 7.2.6). 동의하지 않았으면 비워 둔 비활성 칸
const toProfileValues = (profile: MyProfile, consented: boolean): ProfileValues => ({
  nickname: profile.nickname,
  birthYear: consented && profile.birthYear !== undefined ? String(profile.birthYear) : '',
  gender: consented ? (profile.gender ?? null) : null,
});

// 출생연도·성별 영역이 보이지 않으면(동의하지 않음) 닉네임만 비교
const isSameValues = (a: ProfileValues, b: ProfileValues, withDemographics: boolean) =>
  normalizeNickname(a.nickname) === normalizeNickname(b.nickname) &&
  (!withDemographics || (a.birthYear === b.birthYear && a.gender === b.gender));

/**
 * 개인 프로필 수정(화면 설계서 MY(1) 4~8번): 닉네임·프로필 사진·출생연도·성별(동의한 사람만 보임), 저장되면 MY로
 * 출생연도·성별은 동의한 사람만 저장에 넣고, 비운 값은 없음으로 저장함. 동의하지 않았으면 보내지 않음(상태별 동작은 spec)
 */
export function ProfileEditScreen({
  profile,
  demographicsConsent,
  checkNickname = checkNicknameAvailability,
  pending = false,
  onLeave,
}: {
  profile: MyProfile;
  /**
   * 추가 개인정보(출생연도·성별) 수집·이용 동의 여부. 동의해야 출생연도·성별 칸이 보이고 고칠 수 있음
   * 편집 중 false로 바뀌면(저장 실패 뒤 다시 받아 보니 다른 기기에서 철회함) 영역을 숨기고 저장에서 뺌(기능명세서 7.2.6 예외)
   */
  demographicsConsent: boolean;
  /** 닉네임 중복 확인 호출(테스트에서 바꿔 끼움) */
  checkNickname?: CheckNickname | undefined;
  /** 받아 둔 값으로 먼저 그리고 새 값을 받는 중: 입력·저장을 막음(옛 값으로 저장해 다른 기기의 변경을 덮지 않게) */
  pending?: boolean | undefined;
  /** 뒤로 가기로 떠나기 직전 알림(컨테이너가 받기 실패 때 한 번 더 뒤로 가지 않게) */
  onLeave?: (() => void) | undefined;
}) {
  const backOr = useBackOr();
  const leave = () => {
    onLeave?.();
    backOr(MY_PATHS.home);
  };
  useScrollFocusedIntoView();
  const initial = toProfileValues(profile, demographicsConsent);
  // 지금 내 닉네임과 같으면 중복 확인을 건너뜀(기능명세서 7.2.5 로직 1)
  const fields = useProfileFields(initial, checkNickname, { currentNickname: profile.nickname });
  // 조정을 마친 새 사진(data URL), 기본 이미지로 바꾸면 undefined
  const [photo, setPhoto] = useState(profile.imageSrc);
  const save = useUpdateProfileMutation();
  // 고른 사진을 조정하는 중에는 저장하지 않음(끝나야 새 사진이 정해짐)
  const [photoPending, setPhotoPending] = useState(false);
  // 저장 중·저장 뒤 돌아가는 전환 중 중복 탭 방지(화면 설계서 7번). 누르는 순간은 ref로 막아 버튼 초점을 지킴
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [saved, setSaved] = useState(false);
  const openOverlay = useScreenOverlay();
  const containerRef = useRef<HTMLDivElement>(null);
  // 저장 중 이 화면을 떠났는지(뒤로 가기·언마운트)
  const left = useRef(false);
  useEffect(() => {
    left.current = false;
    return () => {
      left.current = true;
    };
  }, []);

  const changed =
    photo !== profile.imageSrc || !isSameValues(fields.values, initial, demographicsConsent);
  // 출생연도·성별 칸이 보이지 않으면 숨은 값으로 저장을 막지 않음(편집 중 철회로 숨겨진 경우)
  const valid = demographicsConsent ? fields.isValid : fields.isNicknameValid;
  const canSubmit = changed && valid && !photoPending && !saved && !pending;
  // 바꾼 내용이 있으면 나가기 전에 확인(기능명세서 7.2.1 상세 7)
  // 저장 뒤 돌아가는 전환 중에는 묻지 않음
  const back = () => {
    // 저장 중에 떠나면 저장 뒤 이동·토스트를 하지 않음(캐시 갱신은 mutation이 그대로 함)
    if (submitting) {
      left.current = true;
      return leave();
    }
    // 받는 중에는 입력이 잠겨 바꾼 값이 없음(늦게 온 출생연도 등으로 기준값만 바뀐 것)
    if (pending || !changed) return leave();
    openOverlay((rootProps, close) => (
      <ConfirmDialog
        {...rootProps}
        title={MY_MESSAGES.profileLeave.title}
        description={MY_MESSAGES.profileLeave.description}
        confirmLabel={MY_MESSAGES.profileLeave.confirm}
        cancelLabel={MY_MESSAGES.cancel}
        onConfirm={() => {
          close();
          leave();
        }}
      />
    ));
  };

  const photoChange = (): ProfilePhotoChange =>
    photo === profile.imageSrc
      ? { action: 'KEEP' }
      : photo === undefined
        ? { action: 'RESET' }
        : { action: 'REPLACE', photo };

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    closeKeyboard();
    try {
      await save.mutateAsync({
        nickname: normalizeNickname(fields.values.nickname),
        photo: photoChange(),
        demographics: demographicsConsent
          ? {
              birthYear: fields.values.birthYear ? Number(fields.values.birthYear) : undefined,
              gender: fields.values.gender ?? undefined,
            }
          : undefined,
      });
    } catch (error) {
      // 다시 누를 수 있게 되돌림(기능명세서 7.2.7 예외)
      submittingRef.current = false;
      setSubmitting(false);
      const taken = isApiError(error) && error.code === NICKNAME_TAKEN_CODE;
      // 저장 직전 확인에서 금칙어가 걸림(기능명세서 7.2.7 예외)
      const prohibited = prohibitedFieldsOf(error)?.includes('nickname') ?? false;
      // 저장 중에 화면을 떠났으면 입력란 안내를 볼 수 없으므로 저장 실패를 토스트로 알림(이 변경 전과 같은 안내)
      if (prohibited && left.current) {
        toast(MY_MESSAGES.profileSaveFailed);
        return;
      }
      if (taken || prohibited) {
        // 오류 표시를 먼저 반영해 초점이 갈 때 오류 상태로 읽히게 함
        flushSync(() => fields.markNicknameRejected(prohibited ? 'prohibited' : 'taken'));
        // 수정하기가 비활성이 되므로 닉네임 입력으로 초점을 옮김(사진 선택용 숨은 파일 입력 제외)
        containerRef.current?.querySelector<HTMLInputElement>('input:not([type="file"])')?.focus();
      } else {
        toast(MY_MESSAGES.profileSaveFailed);
      }
      return;
    }
    // 떠난 뒤에도 화면이 남는 경우(이동 실패 등) 잠긴 채 멈추지 않게 풀어 둠
    if (left.current) {
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    setSaved(true);
    // MY에서 들어왔으면 그 기록으로 돌아감(replace하면 MY 기록이 두 번 쌓여 뒤로 가기가 한 번 헛돎)
    backOr(MY_PATHS.home);
    toastAfterNavigation(MY_MESSAGES.profileEdited);
  };

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col"
      onPointerDown={dismissKeyboard}
    >
      {/* 저장 중 상태를 스크린 리더에 알림(aria-busy만으로는 읽히지 않는 경우가 많음) */}
      <p role="status" className="sr-only">
        {save.isPending ? MY_MESSAGES.profileSaving : ''}
      </p>
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
            <Button
              className="w-full"
              disabled={!canSubmit}
              aria-busy={save.isPending || undefined}
              onClick={() => void submit()}
            >
              {MY_MESSAGES.profileEditSubmit}
            </Button>
          </div>
        }
      >
        <h1 className="sr-only">{MY_MESSAGES.profileEditTitle}</h1>
        {/* 저장 중·새 값을 받는 중에는 입력을 잠금(보낸 값과 화면 값이 달라진 채 완료되지 않게). 배치에는 영향 없음 */}
        <fieldset
          disabled={submitting || pending}
          aria-busy={pending || undefined}
          className="contents"
        >
          {/* 헤더 아래 48, 사진과 입력 칸 사이 32(Figma 개인 프로필 편집(1)) */}
          <div className="pt-s18 flex flex-col items-center">
            <ProfilePhotoField
              value={photo}
              onChange={setPhoto}
              onPendingChange={setPhotoPending}
            />
          </div>
          <div className="pt-s14 px-padding-p8">
            <ProfileFields fields={fields} showDemographics={demographicsConsent} />
          </div>
        </fieldset>
      </PageShell>
    </div>
  );
}
