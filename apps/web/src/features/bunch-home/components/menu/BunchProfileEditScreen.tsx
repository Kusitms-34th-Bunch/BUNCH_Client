'use client';

import { Button, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { type CheckNickname } from '@/shared/hooks/profile/useNicknameAvailability';
import { type CharacterType } from '@/shared/lib/profile/bunchProfile';
import {
  type BunchProfileDraft,
  type EditableProfile,
  NO_PROHIBITED,
  type ProhibitedValues,
} from '../../lib/profileEdit';
import { BunchProfileEditSkeleton } from './BunchProfileEditSkeleton';
import { EditFrame, ProfileForm } from './BunchProfileForm';

type BunchProfileEditScreenProps = {
  /** 편집할 번치의 저장된 값. 아직 받는 중이면 undefined(폼 대신 스켈레톤, 받는 중 안내는 호출자가 맡음) */
  initial: EditableProfile | undefined;
  onBack: () => void;
  /** 「저장하기」. 서버 저장·이동·토스트는 호출자 담당 */
  onSave: (_draft: BunchProfileDraft) => void;
  /** 저장 요청 중(저장하기를 막음) */
  saving?: boolean | undefined;
  /** 저장 때 서버가 이미 쓰는 이름이라고 거절한 이름(입력란에 사용 중으로 보임) */
  takenName?: string | null | undefined;
  /** 저장 때 서버가 금칙어로 거부한 이름·소개(입력란 아래 안내, 기능명세 5.5.5) */
  prohibited?: ProhibitedValues | undefined;
  /** 이름 중복 확인(지금 이름은 묻지 않음). 없으면 확인하지 않음 */
  checkName?: CheckNickname | undefined;
  /** 번치 타입(대표 사진이 없을 때 보일 기본 이미지를 정함, 모르면 타입 1) */
  characterType?: CharacterType | undefined;
};

/**
 * 번치 프로필 편집(기능명세 5.5): 대표 사진·이름·한 줄 소개·공개 범위를 「저장하기」로 한 번에 저장
 * 사진은 원형 조정 화면을 거친 정사각 JPEG이고, 사진이 있으면 「기본 이미지 적용하기」도 고를 수 있음(`ProfilePhotoField`)
 */
export function BunchProfileEditScreen({
  initial,
  onBack,
  onSave,
  saving = false,
  takenName = null,
  prohibited = NO_PROHIBITED,
  checkName,
  characterType,
}: BunchProfileEditScreenProps) {
  // 뒤로 가기 동작은 폼이 정함(바꾼 내용이 있으면 확인 창)
  const header = (back: () => void) => (
    <Header
      leading={
        <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={back}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
    />
  );
  if (!initial) {
    return (
      <EditFrame
        header={header(onBack)}
        // 실제 폼과 같은 하단 저장하기(받기 전이라 막아 둠): 다 받은 뒤 하단 바가 새로 생겨 본문 높이가 바뀌지 않게
        bottom={
          <div className="pt-padding-p7 px-padding-p8">
            <Button className="w-full" disabled>
              저장하기
            </Button>
          </div>
        }
      >
        <BunchProfileEditSkeleton />
      </EditFrame>
    );
  }
  return (
    <ProfileForm
      initial={initial}
      header={header}
      onBack={onBack}
      onSave={onSave}
      saving={saving}
      takenName={takenName}
      prohibited={prohibited}
      checkName={checkName}
      characterType={characterType}
    />
  );
}
