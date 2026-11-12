'use client';

import { Button, cn, Header, LineChevronLeftLargeIcon } from '@app/design-system';
import {
  CameraButton,
  DescriptionRadioCard,
  LabeledTextField,
  ProfileImage,
} from '@app/design-system/web';
import { type ReactNode, useId, useState } from 'react';
import { HeaderIconButton } from '@/shared/components/layout/HeaderIconButton';
import { PageShell } from '@/shared/components/layout/PageShell';
import { ProfilePhotoField } from '@/shared/components/profile/ProfilePhotoField';
import {
  type CheckNickname,
  useNicknameAvailability,
} from '@/shared/hooks/useNicknameAvailability';
import {
  BUNCH_DESCRIPTION_MAX_LENGTH,
  BUNCH_NAME_CHECKING_MESSAGE,
  BUNCH_NAME_INVALID_MESSAGE,
  BUNCH_NAME_MAX_LENGTH,
  BUNCH_NAME_TAKEN_MESSAGE,
  type CharacterType,
  defaultBunchImage,
  hasInvalidBunchNameChars,
} from '@/shared/lib/bunchProfile';
import { closeKeyboard, dismissKeyboard } from '@/shared/lib/keyboard';
import type { BunchProfileImageChange } from '../../api/bunchHome';
import type { BunchProfileEdit as BunchProfile } from '../../hooks/useBunchProfileEdits';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';

/** 편집할 번치의 저장된 값과 그 값의 프로필 버전 */
type EditableProfile = BunchProfile & { profileVersion?: number | undefined };
/**
 * 저장할 값. 대표 사진은 그대로·새 사진·기본 이미지 중 하나
 * `expectedProfileVersion`은 폼을 연 때의 버전(그 사이 다른 곳에서 바뀌었으면 서버가 거절해 모르고 덮어쓰지 않음)
 */
export type BunchProfileDraft = Omit<BunchProfile, 'imageSrc'> & {
  image: BunchProfileImageChange;
  expectedProfileVersion: number | undefined;
};

type BunchProfileEditScreenProps = {
  /** 편집할 번치의 저장된 값. 아직 모르거나 메인 관리자가 아니면 undefined(폼을 그리지 않음) */
  initial: EditableProfile | undefined;
  onBack: () => void;
  /** 「저장하기」. 서버 저장·이동·토스트는 호출자 담당 */
  onSave: (_draft: BunchProfileDraft) => void;
  /** 저장 요청 중(저장하기를 막음) */
  saving?: boolean | undefined;
  /** 저장 때 서버가 이미 쓰는 이름이라고 거절한 이름(입력란에 사용 중으로 보임) */
  takenName?: string | null | undefined;
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
  checkName,
  characterType,
}: BunchProfileEditScreenProps) {
  const header = (
    <Header
      leading={
        <HeaderIconButton label="뒤로 가기" tone="subtle" onClick={onBack}>
          <LineChevronLeftLargeIcon />
        </HeaderIconButton>
      }
    />
  );
  if (!initial) return <EditFrame header={header} />;
  return (
    <ProfileForm
      initial={initial}
      header={header}
      onSave={onSave}
      saving={saving}
      takenName={takenName}
      checkName={checkName}
      characterType={characterType}
    />
  );
}

function EditFrame({
  header,
  bottom,
  children,
}: {
  header: ReactNode;
  bottom?: ReactNode;
  children?: ReactNode;
}) {
  return (
    // 화면설계서 4번: 빈 영역이나 CTA를 누르면 키보드 닫기, 다른 입력을 누르면 포커스만 이동
    <div className="flex min-h-0 flex-1 flex-col" onPointerDown={dismissKeyboard}>
      <PageShell header={header} bottom={bottom}>
        <h1 className="sr-only">번치 프로필 편집</h1>
        {children}
      </PageShell>
    </div>
  );
}

function ProfileForm({
  initial: latest,
  header,
  onSave,
  saving,
  takenName,
  checkName,
  characterType,
}: {
  initial: EditableProfile;
  header: ReactNode;
  onSave: (_draft: BunchProfileDraft) => void;
  saving: boolean;
  takenName: string | null;
  checkName: CheckNickname | undefined;
  characterType: CharacterType | undefined;
}) {
  const formId = useId();
  // 폼을 연 순간의 값과 버전으로 고정(그 뒤 다시 받은 값으로 바뀌면 입력은 그대로인데 비교·버전만 바뀌어 모르고 덮어씀)
  const [initial] = useState(latest);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isPrivate, setIsPrivate] = useState(initial.isPrivate);
  // 보이는 대표 사진: 처음 값, 조정한 새 사진(data URL), 기본 이미지면 undefined
  const [imageSrc, setImageSrc] = useState(initial.imageSrc);
  const [composing, setComposing] = useState(false);
  // 고른 사진을 읽거나 조정하는 중이면 저장하지 않음(이전 사진으로 저장되지 않게)
  const [photoPending, setPhotoPending] = useState(false);

  const nameInvalid = hasInvalidBunchNameChars(name, composing);
  const normalized = name.normalize('NFC').trim();
  // 규칙에 맞지 않거나 지금 이름 그대로면 서버에 묻지 않음
  const availability = useNicknameAvailability(
    nameInvalid || composing || normalized === initial.name ? '' : normalized,
    checkName,
    { notifyFailure: false },
  );
  // 저장 때 서버가 거절한 이름은 저장 전에 받은 「사용 가능」보다 앞섬(그 사이 다른 번치가 씀). 이름을 바꾸면 다시 확인
  const taken = availability === 'taken' || (takenName !== null && takenName === normalized);
  // 앞뒤 공백만 바뀐 이름은 서버에 같은 이름으로 가므로 바뀐 것으로 보지 않음
  const changed =
    normalized !== initial.name ||
    description !== initial.description ||
    isPrivate !== initial.isPrivate ||
    imageSrc !== initial.imageSrc;
  const canSave =
    changed &&
    !saving &&
    !photoPending &&
    !composing &&
    normalized.length > 0 &&
    !nameInvalid &&
    !taken &&
    availability !== 'checking' &&
    description.trim().length > 0;
  // 비공개였던 번치를 공개로 바꿀 때만 안내(Figma 1873:33513)
  const showPublicNotice = initial.isPrivate && !isPrivate;

  const save = () => {
    closeKeyboard();
    const image: BunchProfileImageChange =
      imageSrc === initial.imageSrc
        ? { action: 'KEEP' }
        : imageSrc === undefined
          ? { action: 'RESET' }
          : { action: 'REPLACE', photo: imageSrc };
    onSave({
      name,
      description,
      isPrivate,
      image,
      expectedProfileVersion: initial.profileVersion,
    });
  };

  return (
    <EditFrame
      header={header}
      bottom={
        // Figma Indicator + CTA: 위 14
        <div className="pt-padding-p7 px-padding-p8">
          <Button type="submit" form={formId} className="w-full" disabled={!canSave}>
            저장하기
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) save();
        }}
      >
        {/* 헤더 아래 32, 사진과 입력 사이 32, 입력 사이 16(Figma 1873:33494) */}
        <div className="pt-s14 px-padding-p8 gap-s14 pb-s8 flex flex-col items-center">
          {/* 고르기 → 원형 조정 → 미리보기. 서버 저장은 「저장하기」에서 함께 함 */}
          <ProfilePhotoField
            value={imageSrc}
            onChange={setImageSrc}
            onPendingChange={setPhotoPending}
            renderPhoto={({ onCameraClick }) => (
              <div className="relative h-22.5 w-23.75 shrink-0">
                <ProfileImage
                  src={imageSrc ?? defaultBunchImage(characterType)}
                  className="absolute top-0 left-0.75"
                />
                <CameraButton
                  aria-label="번치 대표 사진 변경"
                  className="absolute top-15.5 left-16.75"
                  onClick={onCameraClick}
                />
              </div>
            )}
          />
          <p role="status" className="sr-only">
            {saving ? '번치 프로필을 저장하는 중이에요' : ''}
          </p>
          <div className="gap-s8 flex w-full flex-col">
            <LabeledTextField
              title="번치 이름"
              value={name}
              maxLength={BUNCH_NAME_MAX_LENGTH}
              autoComplete="off"
              errorMessage={
                nameInvalid
                  ? BUNCH_NAME_INVALID_MESSAGE
                  : taken
                    ? BUNCH_NAME_TAKEN_MESSAGE
                    : undefined
              }
              // 중복 확인이 도는 동안만 보임(번치 만들기와 같음)
              helperMessage={availability === 'checking' ? BUNCH_NAME_CHECKING_MESSAGE : undefined}
              onChange={(event) => setName(event.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              // 일부 모바일 키보드의 조합 종료 없는 포커스 이탈 처리
              onBlur={() => setComposing(false)}
            />
            <LabeledTextField
              title="한 줄 소개"
              value={description}
              maxLength={BUNCH_DESCRIPTION_MAX_LENGTH}
              autoComplete="off"
              onChange={(event) => setDescription(event.target.value)}
            />
            <fieldset className="min-w-0">
              <legend className="typography-body-3-semibold text-text-secondary pb-s6">
                공개 범위
              </legend>
              <div className="gap-s5 flex flex-col">
                <div className="flex flex-col">
                  <DescriptionRadioCard
                    name="visibility"
                    value="public"
                    title="공개"
                    description="누구나 우리 번치와 번들을 볼 수 있어요."
                    checked={!isPrivate}
                    onChange={() => setIsPrivate(false)}
                  />
                  {/* 화면설계서 5-1: On Click / Smart Animate / Ease out(시간은 디자이너 요청 150ms). 자리가 벌어지며 나타나고 아래 카드도 함께 이동 */}
                  <div
                    aria-hidden
                    className={cn(
                      'grid transition-[grid-template-rows,opacity,visibility] duration-150 ease-[ease-out] motion-reduce:transition-none',
                      showPublicNotice
                        ? 'visible grid-rows-[1fr] opacity-100'
                        : 'invisible grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="typography-body-4-regular text-text-quaternary px-padding-p8 py-s2 mt-s2 flex">
                        <span>*</span>
                        <span>{BUNCH_HOME_MESSAGES.publicNotice}</span>
                      </p>
                    </div>
                  </div>
                  {/* 화면용 문구는 항상 있어 낭독되지 않으므로 공개를 고르는 순간 읽힐 status를 따로 둠 */}
                  <p role="status" className="sr-only">
                    {showPublicNotice ? BUNCH_HOME_MESSAGES.publicNotice : ''}
                  </p>
                </div>
                <DescriptionRadioCard
                  name="visibility"
                  value="private"
                  title="비공개"
                  description="팔로우를 승인한 번치만 우리 번치와 번들을 볼 수 있어요."
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                />
              </div>
            </fieldset>
          </div>
        </div>
      </form>
    </EditFrame>
  );
}
