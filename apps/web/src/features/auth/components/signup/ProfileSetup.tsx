'use client';

import { isApiError } from '@app/api-core';
import { Button, toast } from '@app/design-system';
import { PageHeader } from '@app/design-system/web';
import { useRef, useState } from 'react';
import type { CheckNickname } from '@/shared/hooks/useNicknameAvailability';
import { ProfileFields } from '@/shared/components/profile/ProfileFields';
import { ProfilePhotoField } from '@/shared/components/profile/ProfilePhotoField';
import { EMPTY_PROFILE_VALUES, useProfileFields } from '@/shared/hooks/useProfileFields';
import { useScrollFocusedIntoView } from '@/shared/hooks/useScrollFocusedIntoView';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import { normalizeNickname } from '@/shared/lib/nickname';
import { checkNicknameAvailability } from '../../api/registration';
import { useTermsAgreement } from '../../contexts/termsAgreementContext';
import { useRegisterMutation } from '../../queries/signup';
import { SignupFrame } from './SignupFrame';

type ProfileSetupProps = {
  /** 닉네임 중복 확인 호출. 기본은 서버 확인, 테스트에서 대체하고 null이면 확인하지 않음 */
  checkNickname?: CheckNickname | null | undefined;
};

/** 프로필 저장 실패 문구(기획 1.4.7). 닉네임 중복은 입력란 아래 문구로 따로 안내 */
const SAVE_FAILURE_MESSAGE = '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요';
/** 닉네임 중복(`POST /members/me/registration`의 409 오류 코드) */
const NICKNAME_TAKEN_CODE = 'USER_002';

/**
 * 가입 마지막 단계인 프로필 작성 화면
 * 닉네임(필수)이 규칙에 맞고 중복이 아닐 때만 시작하기 활성화. 출생연도·성별은 선택 약관(추가 개인정보)에 동의했을 때만 보임
 * 시작하기는 프로필(사진 포함)을 서버에 저장하고 가입 상태를 다시 읽은 뒤 이동. 닉네임 중복은 입력란 아래 문구, 그 밖의 실패는 토스트
 */
export function ProfileSetup({ checkNickname = checkNicknameAvailability }: ProfileSetupProps) {
  useScrollFocusedIntoView();
  const { agreed } = useTermsAgreement();
  const showDemographics = agreed.demographics;
  const fields = useProfileFields(EMPTY_PROFILE_VALUES, checkNickname ?? undefined);
  const register = useRegisterMutation();
  // 고른 사진(조정을 마친 JPEG data URL). 없으면 기본 이미지
  const [photo, setPhoto] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);

  const start = async () => {
    if (register.isPending) return;
    closeKeyboard();
    const { nickname, birthYear, gender } = fields.values;
    try {
      await register.mutateAsync({
        nickname: normalizeNickname(nickname),
        demographicsConsent: showDemographics,
        ...(showDemographics && birthYear !== '' ? { birthYear: Number(birthYear) } : {}),
        ...(showDemographics && gender ? { gender } : {}),
        ...(photo ? { photo } : {}),
      });
    } catch (error) {
      if (isApiError(error) && error.code === NICKNAME_TAKEN_CODE) {
        fields.markNicknameTaken();
        // 시작하기가 비활성이 되므로 포커스를 닉네임 입력으로 돌려 바로 고칠 수 있게 함
        // 첫 입력란(닉네임). 사진 선택용 숨은 파일 입력은 제외
        containerRef.current?.querySelector<HTMLInputElement>('input:not([type="file"])')?.focus();
      } else {
        toast(SAVE_FAILURE_MESSAGE);
      }
    }
    // 성공하면 이동하지 않음: 가입 상태를 다시 읽은 가드(AuthGate)가 가입 완료 사용자를 도착 화면으로 보냄
  };

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col"
      onPointerDown={dismissKeyboard}
    >
      {/* 저장 중 상태를 스크린 리더에 알림(aria-busy만으로는 읽히지 않는 경우가 많음, 화면에는 숨김) */}
      <p role="status" className="sr-only">
        {register.isPending ? '프로필을 저장하는 중이에요' : ''}
      </p>
      <SignupFrame
        bottom={
          <div className="px-padding-p8 pt-padding-p7">
            <Button
              className="w-full"
              disabled={!fields.isValid}
              aria-busy={register.isPending || undefined}
              onClick={() => void start()}
            >
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
          <ProfileFields
            fields={fields}
            showDemographics={showDemographics}
            note="출생연도와 성별은 서비스 개선을 위한 통계 분석에만 활용되며, 다른 사용자에게 공개되지 않아요."
          />
        </div>
      </SignupFrame>
    </div>
  );
}
